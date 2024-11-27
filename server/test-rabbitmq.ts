import * as amqp from 'amqplib'
import dotenv from 'dotenv'

dotenv.config()

async function testRabbitMQ() {
  try {
    console.log('Connecting to RabbitMQ...')
    const connection = await amqp.connect(process.env.RABBITMQ_URL!)
    console.log('Connected to RabbitMQ')

    const channel = await connection.createChannel()
    console.log('Channel created')

    const queue = 'test-queue'
    await channel.assertQueue(queue, { durable: true })
    console.log('Queue created:', queue)

    // Send a test message
    const message = 'Test message from video generator'
    await channel.sendToQueue(queue, Buffer.from(message))
    console.log('Test message sent:', message)

    // Receive the message
    console.log('Waiting for messages...')
    channel.consume(queue, (msg) => {
      if (msg) {
        console.log('Received message:', msg.content.toString())
        channel.ack(msg)
      }
    })

    // Close after 5 seconds
    setTimeout(async () => {
      await channel.close()
      await connection.close()
      console.log('Connection closed')
      process.exit(0)
    }, 5000)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

testRabbitMQ()
