// const { Socket } = require("socket.io")
const userName = "Rob-" + Math.floor(Math.random() * 100000)
const password = "x"

document.getElementById('user-name').innerHTML = userName; 

const localVideoEle = document.getElementById('local-video')
const remoteVideoEl = document.querySelector('#remote-video');

let localStreams;
let remoteStream;
let peerconnection;
let didIoffer = false


const socket = io.connect('https://localhost:3000', {
    auth: {
        userName: userName,
        password: password
    }
}
)

let peerConfiguration = {
    iceServers: [
        {
            urls: [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302'
            ]
        }
    ]
}



// let offerObj = false

// Initiating a call
const call = async (e) => {

    console.log("I am in the call function")
    await fetchUserMedia();
    // console.log("I am in the call function bithc")
    await createPeerConnection();

    // console.log(offerObj)
    try {
        console.log("Creating a offer...");
        const offer = await peerconnection.createOffer()
        console.log(offer)
        peerconnection.setLocalDescription(offer)
        didIoffer = true
        socket.emit('createOffer', offer)
    } catch (error) {
        console.log(error)
    }

}

const answerOffer = async (offerObj) => {
    await fetchUserMedia();

    await createPeerConnection(offerObj)

    try {
        console.log("Creating an answer")
        const answer = await peerconnection.createAnswer({});
        console.log(answer)
        peerconnection.setLocalDescription(answer)

        offerObj.answer = answer

        const offererIceCandidates = await socket.emitWithAck('newAnswer', offerObj)

        offererIceCandidates.forEach(c => {
            peerconnection.addIceCandidate(c)
            console.log("Added Ice Candidate ")
        })

    } catch (error) {
        console.log(error)
    }
}

const addAnswer = async (offerObj) => {
    console.log("This is in addAnswer",offerObj.answer)
    try {
        await peerconnection.setRemoteDescription(offerObj.answer)
    } catch (error) {
        console.log(error)
    }

}



const fetchUserMedia = async () => {
    // localVideoEle.srcObject = streams
    // console.log(streams)
    console.log("I am adding streams")
    try {
        const streams = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true
        })
        console.log(streams)
        localVideoEle.srcObject = streams
        console.log("Added Stream")
        console.log(typeof (streams.getTracks()))
        localStreams = streams
        // resolve()
    } catch (error) {
        console.log(error)
    }
}

const createPeerConnection = async (offerObj) => {
    peerconnection = await new RTCPeerConnection(peerConfiguration);
    console.log("Creating peer connection", peerconnection)


    remoteStream = new MediaStream()
    remoteVideoEl.srcObject = remoteStream;

    localStreams.getTracks().forEach(track => {
        peerconnection.addTrack(track,localStreams)
    })

    peerconnection.addEventListener('icecandidate', e => {
        console.log("ice candidate", e.candidate)
        if (e.candidate) {
            socket.emit('sendIceCandidateToSignallingServer', {
                iceCandidate: e.candidate,
                userName: userName,
                didIoffer
            })
        }
    })

    peerconnection.addEventListener('track', e => {
        console.log("Got a track from the other peer!! How excting")
        console.log("These are the tracks",e)
        e.streams[0].getTracks().forEach(track => {
            // remoteStream = new MediaStream()
            remoteStream.addTrack(track, remoteStream);
            console.log("Here's an exciting moment... fingers cross")
        })
    })

    console.log("This is the offerobj ", offerObj)
    if (offerObj) {
        //this won't be set when called from call();
        //will be set when we call from answerOffer()
        // console.log(peerConnection.signalingState) //should be stable because no setDesc has been run yet

        await peerconnection.setRemoteDescription(offerObj.offer)
        // console.log(peerConnection.signalingState) //should be have-remote-offer, because client2 has setRemoteDesc on the offer
    }

}

const addNewIceCandidate = iceCandidate => {
    peerConnection.addIceCandidate(iceCandidate)
    console.log("======Added Ice Candidate======")
}

// call()
document.querySelector('#call').addEventListener('click', call)
// fetchUserMedia();