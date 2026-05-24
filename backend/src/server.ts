import { createApp } from './app.js'
import { env } from './env.js'
import { prisma } from './lib/prisma.js'

const app = createApp()
const server = app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT} (env: ${env.NODE_ENV})`)
})

const shutdown = (signal: string) => {
  console.log(`\n${signal} received — shutting down.`)
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
