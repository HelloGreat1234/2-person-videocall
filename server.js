const fs = require('fs')
const https = require('https')
const express = require('express')
const socektio = require('socket.io')
const app = express()

app.use(express.static(__dirname))

const key = fs.readFileSync('cert.key');
const cert = fs.readFileSync('cert.crt');

const expressServer = https.createServer({ key, cert }, app)

let offers = []

let connectedSockets = []

const io = socektio(expressServer, {
    cors: {
        origin: [
            "https://localhost",
            'https://two-person-videocall.onrender.com' //if using a phone or another computer
        ],
        methods: ["GET", "POST"]
    }
})
const port = process.env.PORT || 3000;
expressServer.listen(port, () => {
    console.log('Server is running on https://localhost:3000');
});

io.on('connection', socket => {

    console.log("socket connected")

    const userName = socket.handshake.auth.userName
    const password = socket.handshake.auth.password

    connectedSockets.push({
        socketId: socket.id,
        userName
    })
    socket.on('createOffer', (offer) => {
        offers.push({
            offererUsername: userName,
            offer: offer,
            offerIceCandidates: [],
            answereUsername: null,
            answer: null,
            answererIceCandidates: []
        })

        socket.broadcast.emit('newOfferAwaiting', offers.slice(-1))
    })

    socket.on('sendIceCandidateToSignallingServer', (iceCandidateObject) => {
        const { userName, iceCandidate, didIoffer } = iceCandidateObject;

        if (didIoffer) {

            const IceCandidateOffers = offers.find(o => o.offererUsername === userName)

            if (IceCandidateOffers) {
                IceCandidateOffers.offerIceCandidates.push(iceCandidate)

                if (IceCandidateOffers.answereUsername) {
                    const socketTosendto = connectedSockets.find(s => s.userName === IceCandidateOffers.answereUsername)
                    socket.to(socketTosendto.socketId).emit('receivedIceCandidateFromServer', iceCandidate)
                }
                else {
                    console.log("Ice candidates saved but no answere found ")
                }
            }
        } else {
            const IceCandidateOffers = offers.find(o => o.answereUsername === userName)
            if(IceCandidateOffers){
                IceCandidateOffers.answererIceCandidates.push(iceCandidate)
                const socketToSendTo = connectedSockets.find(s=>s.userName === offerInOffers.offererUsername);
                if(socketToSendTo){
                    socket.to(socketToSendTo.socketId).emit('receivedIceCandidateFromServer',iceCandidate)
                }else{
                    console.log("Ice candidate recieved but could not find offerer")
                }
            }
        }
    })

    socket.on('newAnswer', (offerObj, AckFunction) => {
        console.log(offerObj.offererUsername)
        console.log(connectedSockets)
        const socketTosendto = connectedSockets.find(s => s.userName === offerObj.offererUsername)

        if (!socketTosendto) {
            console.log("user disconnected")
            return
        }

        // const socketIdToAnswer = socketTosendto.socketId

        const updatedOfferObj = offers.find(o => o.offererUsername === offerObj.offererUsername)

        updatedOfferObj.answer = offerObj.answer;
        updatedOfferObj.answereUsername = offerObj.userName

        AckFunction(updatedOfferObj.offerIceCandidates)

        if (!updatedOfferObj) {
            console.log("no such offer exists")
            return
        }

        socket.to(socketTosendto.socketId).emit('answerResponse', updatedOfferObj)

    })
})