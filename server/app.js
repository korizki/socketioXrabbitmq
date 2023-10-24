const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const amqplib = require('amqplib')

const app = express()
app.use(express.json())
const server = http.createServer(app)
const io = new Server(server, {
   cors: {
      origin: "http://localhost:3000",
      credentials: true
   }
})
// rabitmq config
const rabbitMqServer = 'amqp://localhost'
const queueName = 'message'
// starting listening
async function startListening() {
   const connection = await amqplib.connect(rabbitMqServer)
   const channel = await connection.createChannel()
   await channel.assertQueue(queueName, { durable: false })
   // socket io
   io.on('connection', socket => {
      console.log('socket connected')
      // on receiving message from client
      socket.on('chat', message => {
         console.log('client send you new message')
         io.emit('client message', message)
      })
      // ketika user dicosnnect
      socket.on('disconnect', () => console.log('Client has disconnect'))
      //rabbitmq consume based on queName 
      channel.consume(
         queueName,
         message => {
            io.emit('client message', message.content.toString())
         },
         { noAck: true }
      )
   })
}

startListening()
// post hit endpoint 
app.post('/send', async (req, res) => {
   let message = req.body.message || '-'
   const connection = await amqplib.connect(rabbitMqServer)
   const channel = await connection.createChannel()
   await channel.assertQueue(queueName, { durable: false })
   // send message
   channel.sendToQueue(queueName, Buffer.from(message))
   res.status(200).json({
      status: 'OK',
      information: 'Your message has been send'
   })
})

server.listen(3100, () => {
   console.log('Listening at port 3100')
})