import { PrismaClient, Language } from '@prisma/client'
import bcrypt from 'bcrypt'

/**
 * Seed script: bootstraps the library catalog and a couple of users.
 * Idempotent — re-runnable. Wipe with `npx prisma migrate reset`.
 *
 * Books mirror the frontend mock catalog so the UI keeps working when
 * pointed at the real API. Author / Category / Tag are upserted by
 * unique name; BookCopy rows are only inserted if the book has none.
 */

const prisma = new PrismaClient()

type SeedBook = {
  isbn: string
  title: string
  author: string
  year: number
  language: Language
  blurb: string
  shelfCode: string
  categories: string[]
  tags: string[]
  total: number
}

const BOOKS: SeedBook[] = [
  {
    isbn: '978-0000000001',
    title: 'מקום קטן ביקום',
    author: 'נעמי שמר',
    year: 2014,
    language: Language.HE,
    blurb: 'אסופת שירים נבחרת המסכמת ארבעה עשורים של יצירה.',
    shelfCode: 'A-3',
    categories: ['שירה', 'ספרות ישראלית'],
    tags: ['פיוט', 'ארץ ישראל'],
    total: 3,
  },
  {
    isbn: '978-0000000002',
    title: 'The Name of the Wind',
    author: 'Patrick Rothfuss',
    year: 2007,
    language: Language.EN,
    blurb: 'A musician and arcanist tells the story of how he became a legend.',
    shelfCode: 'B-7',
    categories: ['Fantasy', 'Fiction'],
    tags: ['epic', 'first-person', 'magic-system'],
    total: 2,
  },
  {
    isbn: '978-0000000003',
    title: 'מעולם לא היינו מודרניים',
    author: 'ברונו לאטור',
    year: 2005,
    language: Language.HE,
    blurb: 'מסה פילוסופית על המודרניות והגבול שבין טבע לתרבות.',
    shelfCode: 'A-9',
    categories: ['פילוסופיה', 'מדע'],
    tags: ['STS', 'תיאוריה'],
    total: 1,
  },
  {
    isbn: '978-0000000004',
    title: 'Klara and the Sun',
    author: 'Kazuo Ishiguro',
    year: 2021,
    language: Language.EN,
    blurb: 'An artificial friend watches the world through a shop window.',
    shelfCode: 'B-2',
    categories: ['Fiction', 'Literary'],
    tags: ['AI', 'speculative', 'quiet'],
    total: 4,
  },
  {
    isbn: '978-0000000005',
    title: 'סיפור על אהבה וחושך',
    author: 'עמוס עוז',
    year: 2002,
    language: Language.HE,
    blurb: 'אוטוביוגרפיה ספרותית על ילדות בירושלים שלפני קום המדינה.',
    shelfCode: 'A-1',
    categories: ['זיכרונות', 'ספרות ישראלית'],
    tags: ['ירושלים', 'משפחה'],
    total: 2,
  },
  {
    isbn: '978-0000000006',
    title: 'Project Hail Mary',
    author: 'Andy Weir',
    year: 2021,
    language: Language.EN,
    blurb: 'A lone astronaut wakes far from Earth with no memory and a mission.',
    shelfCode: 'B-4',
    categories: ['Sci-Fi', 'Fiction'],
    tags: ['hard-sf', 'first-person', 'humor'],
    total: 3,
  },
  {
    isbn: '978-0000000007',
    title: 'בלדות ארץ ישראליות',
    author: 'יהודה עמיחי',
    year: 1995,
    language: Language.HE,
    blurb: 'מבחר ארוך-טווח מיצירתו של אחד המשוררים החשובים בעברית.',
    shelfCode: 'A-3',
    categories: ['שירה'],
    tags: ['קלאסי', 'ארץ ישראל'],
    total: 2,
  },
  {
    isbn: '978-0000000008',
    title: 'The Pragmatic Programmer',
    author: 'Hunt & Thomas',
    year: 2019,
    language: Language.EN,
    blurb: 'A modern classic on the craft of writing software that lasts.',
    shelfCode: 'C-1',
    categories: ['Tech', 'Non-fiction'],
    tags: ['software', 'craft', 'reference'],
    total: 5,
  },
  {
    isbn: '978-0000000009',
    title: 'תולדות הזמן הקצר',
    author: 'סטיבן הוקינג',
    year: 1992,
    language: Language.HE,
    blurb: 'מסע נגיש בקוסמולוגיה המודרנית, מהמפץ הגדול ועד החורים השחורים.',
    shelfCode: 'A-7',
    categories: ['מדע פופולרי', 'פיזיקה'],
    tags: ['קוסמולוגיה'],
    total: 3,
  },
  {
    isbn: '978-0000000010',
    title: 'Educated',
    author: 'Tara Westover',
    year: 2018,
    language: Language.EN,
    blurb: 'A memoir of growing up off-grid and finding her way to Cambridge.',
    shelfCode: 'B-9',
    categories: ['Memoir', 'Non-fiction'],
    tags: ['family', 'education'],
    total: 3,
  },
  {
    isbn: '978-0000000011',
    title: 'יומן אנה פרנק',
    author: 'אנה פרנק',
    year: 1986,
    language: Language.HE,
    blurb: 'יומן הנערה אנה פרנק שנכתב במסתור באמסטרדם בימי השואה.',
    shelfCode: 'A-2',
    categories: ['זיכרונות', 'היסטוריה'],
    tags: ['שואה', 'קלאסי'],
    total: 4,
  },
  {
    isbn: '978-0000000012',
    title: 'A Little History of Philosophy',
    author: 'Nigel Warburton',
    year: 2011,
    language: Language.EN,
    blurb: 'Forty short chapters introducing the central thinkers of philosophy.',
    shelfCode: 'B-6',
    categories: ['Philosophy', 'Non-fiction'],
    tags: ['intro', 'survey'],
    total: 2,
  },
]

const USERS = [
  {
    email: 'sara@library.org',
    firstName: 'Sara',
    lastName: 'Greene',
    role: 'LIBRARIAN' as const,
    password: 'library123',
  },
  {
    email: 'yael@example.com',
    firstName: 'Yael',
    lastName: 'Shalev',
    role: 'READER' as const,
    password: 'reader123',
  },
]

// (readerEmail, isbn, value) — seed ratings so the recommender has signal
const RATINGS: Array<[string, string, number]> = [
  ['yael@example.com', '978-0000000002', 5],
  ['yael@example.com', '978-0000000006', 5],
  ['yael@example.com', '978-0000000004', 4],
  ['yael@example.com', '978-0000000005', 5],
  ['yael@example.com', '978-0000000008', 4],
]

async function main() {
  console.log('— Seeding users…')
  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 12)
    await prisma.user.upsert({
      where: { email: u.email },
      update: { firstName: u.firstName, lastName: u.lastName, role: u.role },
      create: {
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        passwordHash,
      },
    })
  }

  console.log('— Seeding catalog…')
  for (const b of BOOKS) {
    const author = await prisma.author.upsert({
      where: { name: b.author },
      update: {},
      create: { name: b.author },
    })

    const categoryConnect = await Promise.all(
      b.categories.map((name) =>
        prisma.category.upsert({
          where: { name },
          update: {},
          create: { name, slug: slugify(name) },
        }),
      ),
    )

    const tagConnect = await Promise.all(
      b.tags.map((name) =>
        prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        }),
      ),
    )

    const book = await prisma.book.upsert({
      where: { isbn: b.isbn },
      update: {
        title: b.title,
        year: b.year,
        language: b.language,
        blurb: b.blurb,
        shelfCode: b.shelfCode,
        authorId: author.id,
        categories: { set: categoryConnect.map((c) => ({ id: c.id })) },
        tags: { set: tagConnect.map((t) => ({ id: t.id })) },
      },
      create: {
        isbn: b.isbn,
        title: b.title,
        year: b.year,
        language: b.language,
        blurb: b.blurb,
        shelfCode: b.shelfCode,
        authorId: author.id,
        categories: { connect: categoryConnect.map((c) => ({ id: c.id })) },
        tags: { connect: tagConnect.map((t) => ({ id: t.id })) },
      },
    })

    const existingCopies = await prisma.bookCopy.count({ where: { bookId: book.id } })
    if (existingCopies === 0) {
      await prisma.bookCopy.createMany({
        data: Array.from({ length: b.total }, (_, i) => ({
          barcode: `${b.isbn}-c${String(i + 1).padStart(3, '0')}`,
          bookId: book.id,
        })),
      })
    }
  }

  console.log('— Seeding ratings…')
  for (const [email, isbn, value] of RATINGS) {
    const user = await prisma.user.findUnique({ where: { email } })
    const book = await prisma.book.findUnique({ where: { isbn } })
    if (!user || !book) continue
    await prisma.rating.upsert({
      where: { userId_bookId: { userId: user.id, bookId: book.id } },
      update: { value },
      create: { userId: user.id, bookId: book.id, value },
    })
  }

  const counts = {
    users: await prisma.user.count(),
    books: await prisma.book.count(),
    copies: await prisma.bookCopy.count(),
    authors: await prisma.author.count(),
    categories: await prisma.category.count(),
    tags: await prisma.tag.count(),
    ratings: await prisma.rating.count(),
  }
  console.log('— Done.', counts)
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w֐-׿]+/g, '-')
    .replace(/^-|-$/g, '')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
