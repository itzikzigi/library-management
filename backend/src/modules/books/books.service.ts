import { Prisma, type Book } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/HttpError.js'
import type { CreateBookBody, UpdateBookBody } from './books.schema.js'

/**
 * Librarian-side book CRUD. Read endpoints live in `books.controller.ts`
 * because they're public; the mutations here are gated by `requireRole`
 * upstream. Author / Category / Tag are upserted by unique-name so the
 * librarian can simply type a new tag without first creating it.
 */

export async function createBook(body: CreateBookBody): Promise<Book> {
  if (body.isbn) {
    const dup = await prisma.book.findUnique({ where: { isbn: body.isbn } })
    if (dup) {
      throw new HttpError(409, 'ISBN_TAKEN', 'A book with this ISBN already exists')
    }
  }

  return prisma.$transaction(async (tx) => {
    const author = await tx.author.upsert({
      where: { name: body.authorName },
      update: {},
      create: { name: body.authorName },
    })
    const categories = await Promise.all(
      body.categories.map((name) =>
        tx.category.upsert({
          where: { name },
          update: {},
          create: { name, slug: slugify(name) },
        }),
      ),
    )
    const tags = await Promise.all(
      body.tags.map((name) =>
        tx.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        }),
      ),
    )

    const book = await tx.book.create({
      data: {
        isbn: body.isbn,
        title: body.title,
        year: body.year,
        language: body.language,
        blurb: body.blurb,
        shelfCode: body.shelfCode,
        authorId: author.id,
        categories: { connect: categories.map((c) => ({ id: c.id })) },
        tags: { connect: tags.map((t) => ({ id: t.id })) },
      },
    })

    // Generate barcodes inside the transaction so a partial create can't
    // leave a book without copies — the catalog filter `availableOnly`
    // would silently exclude it.
    const baseBarcode = body.isbn ?? `BK-${book.id.slice(-8)}`
    await tx.bookCopy.createMany({
      data: Array.from({ length: body.totalCopies }, (_, i) => ({
        barcode: `${baseBarcode}-c${String(i + 1).padStart(3, '0')}`,
        bookId: book.id,
      })),
    })

    return book
  })
}

export async function updateBook(id: string, body: UpdateBookBody): Promise<Book> {
  const existing = await prisma.book.findUnique({ where: { id } })
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Book not found')

  return prisma.$transaction(async (tx) => {
    const data: Prisma.BookUpdateInput = {}
    if (body.title !== undefined) data.title = body.title
    if (body.year !== undefined) data.year = body.year
    if (body.language !== undefined) data.language = body.language
    if (body.blurb !== undefined) data.blurb = body.blurb
    if (body.shelfCode !== undefined) data.shelfCode = body.shelfCode

    if (body.authorName !== undefined) {
      const author = await tx.author.upsert({
        where: { name: body.authorName },
        update: {},
        create: { name: body.authorName },
      })
      data.author = { connect: { id: author.id } }
    }
    if (body.categories !== undefined) {
      const categories = await Promise.all(
        body.categories.map((name) =>
          tx.category.upsert({
            where: { name },
            update: {},
            create: { name, slug: slugify(name) },
          }),
        ),
      )
      data.categories = { set: categories.map((c) => ({ id: c.id })) }
    }
    if (body.tags !== undefined) {
      const tags = await Promise.all(
        body.tags.map((name) =>
          tx.tag.upsert({
            where: { name },
            update: {},
            create: { name },
          }),
        ),
      )
      data.tags = { set: tags.map((t) => ({ id: t.id })) }
    }

    return tx.book.update({ where: { id }, data })
  })
}

/**
 * Hard-deletes a book and (via Book → BookCopy cascade) its copies.
 * Refuses with 409 when any copy has loan history — the Loan FK is
 * onDelete: Restrict per ADR-0001 to preserve audit trails. Librarians
 * should reduce circulation via copy-level WITHDRAWN instead (not
 * exposed in this version).
 */
export async function deleteBook(id: string): Promise<void> {
  const book = await prisma.book.findUnique({
    where: { id },
    include: { copies: { select: { id: true } } },
  })
  if (!book) throw new HttpError(404, 'NOT_FOUND', 'Book not found')

  if (book.copies.length > 0) {
    const loanCount = await prisma.loan.count({
      where: { copyId: { in: book.copies.map((c) => c.id) } },
    })
    if (loanCount > 0) {
      throw new HttpError(
        409,
        'HAS_LOAN_HISTORY',
        'Cannot delete a book with loan history — withdraw copies instead',
      )
    }
  }
  await prisma.book.delete({ where: { id } })
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w֐-׿]+/g, '-')
    .replace(/^-|-$/g, '')
}
