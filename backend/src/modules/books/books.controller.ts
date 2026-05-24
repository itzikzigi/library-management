import type { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/HttpError.js'

/**
 * GET /api/v1/books
 * Purpose: paginated/filtered list of books for the reader catalog.
 * Input: { q?, category?, language?, availableOnly?, sort? } (validated)
 * Output: { data: Book[] }
 */
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { q, category, language, availableOnly, sort } = req.query as {
      q?: string
      category?: string
      language?: 'HE' | 'EN'
      availableOnly?: boolean
      sort?: 'title' | 'newest' | 'rating'
    }

    const where: Prisma.BookWhereInput = {}
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { author: { name: { contains: q, mode: 'insensitive' } } },
      ]
    }
    if (category) where.categories = { some: { name: category } }
    if (language) where.language = language
    if (availableOnly) where.copies = { some: { status: 'AVAILABLE' } }

    const orderBy: Prisma.BookOrderByWithRelationInput =
      sort === 'newest' ? { year: 'desc' } : { title: 'asc' }

    const books = await prisma.book.findMany({
      where,
      orderBy,
      include: {
        author: true,
        categories: true,
        tags: true,
        copies: { select: { status: true } },
        ratings: { select: { value: true } },
      },
    })

    res.json({ data: books.map(toBookDTO) })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/v1/books/:id
 * Purpose: full book detail for the reader book page.
 * Input: path param `id`
 * Output: { data: Book }
 */
export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const book = await prisma.book.findUnique({
      where: { id: req.params.id },
      include: {
        author: true,
        categories: true,
        tags: true,
        copies: true,
        ratings: { select: { value: true } },
      },
    })
    if (!book) throw new HttpError(404, 'NOT_FOUND', 'Book not found')

    const total = book.copies.length
    const available = book.copies.filter((c) => c.status === 'AVAILABLE').length
    const rating =
      book.ratings.length > 0
        ? Number((book.ratings.reduce((s, r) => s + r.value, 0) / book.ratings.length).toFixed(2))
        : null

    let myRating: number | null = null
    if (req.user) {
      const mine = await prisma.rating.findUnique({
        where: { userId_bookId: { userId: req.user.id, bookId: book.id } },
        select: { value: true },
      })
      myRating = mine?.value ?? null
    }

    res.json({
      data: {
        id: book.id,
        isbn: book.isbn,
        title: book.title,
        author: book.author.name,
        year: book.year,
        language: book.language,
        blurb: book.blurb,
        shelfCode: book.shelfCode,
        categories: book.categories.map((c) => c.name),
        tags: book.tags.map((t) => t.name),
        total,
        available,
        rating,
        ratingsCount: book.ratings.length,
        myRating,
      },
    })
  } catch (err) {
    next(err)
  }
}

type BookWithIncludes = Prisma.BookGetPayload<{
  include: {
    author: true
    categories: true
    tags: true
    copies: { select: { status: true } }
    ratings: { select: { value: true } }
  }
}>

function toBookDTO(b: BookWithIncludes) {
  const total = b.copies.length
  const available = b.copies.filter((c) => c.status === 'AVAILABLE').length
  const rating =
    b.ratings.length > 0
      ? Number((b.ratings.reduce((s, r) => s + r.value, 0) / b.ratings.length).toFixed(2))
      : null
  return {
    id: b.id,
    isbn: b.isbn,
    title: b.title,
    author: b.author.name,
    year: b.year,
    language: b.language,
    blurb: b.blurb,
    shelfCode: b.shelfCode,
    categories: b.categories.map((c) => c.name),
    tags: b.tags.map((t) => t.name),
    total,
    available,
    rating,
    ratingsCount: b.ratings.length,
  }
}
