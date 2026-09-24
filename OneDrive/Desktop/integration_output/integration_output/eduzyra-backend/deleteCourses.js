// deleteCourses2.js
// Removes the 3 leftover duplicate courses so only the real 37-course
// catalog remains.
//
// Run with: node deleteCourses2.js

import 'dotenv/config'
import mongoose from 'mongoose'
import Course from './src/models/Course.js'

const slugsToDelete = [
  'ml-foundations',                      // duplicate of "machine-learning-foundations"
  'artificial-intelligence-foundations', // overlaps with generative-ai / ai-machine-learning
  'cybersecurity-fundamentals',          // overlaps with cybersecurity-soc-analyst / ethical-hacking-cybersecurity
  'java-full-stack-development',
  'python-full-stack-development',
]

async function run() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    console.error('MONGO_URI is not set.')
    process.exit(1)
  }

  await mongoose.connect(uri)
  console.log('Connected to MongoDB:', mongoose.connection.name)

  const result = await Course.deleteMany({ slug: { $in: slugsToDelete } })
  console.log(`Deleted ${result.deletedCount} course(s).`)

  const total = await Course.countDocuments()
  console.log(`\nTotal courses remaining: ${total}`)

  const remaining = await Course.find({}, 'slug title').sort({ title: 1 }).lean()
  remaining.forEach((c) => console.log(` - ${c.slug} (${c.title})`))

  await mongoose.disconnect()
  process.exit(0)
}

run().catch((err) => {
  console.error('Error deleting courses:', err)
  process.exit(1)
})
