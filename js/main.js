'use strict'

const local = document.getElementById('local');
const remote = document.getElementById('remote');

let sender;
let receiver;

const btnStartLocalVideo = document.getElementById('btnStartLocalVideo');
const btnCall = document.getElementById('btnCall');

btnStartLocalVideo.addEventListener('click', handleStartLocal);
btnCall.addEventListener('click', handleCall);

const videoConstraints = {
  fullHd: {
    width: { exact: 1920 },
    height: { exact: 1080 },
  },
  hd: {
    width: { exact: 1280 },
    height: { exact: 720 },
  },
  vga: {
    width: { exact: 640 },
    height: { exact: 480 },
  },
  qvga: {
    width: { exact: 320 },
    height: { exact: 240 },
  },
};

function handleSuccessStartLocal(stream) {
  local.srcObject = stream;
  btnCall.disabled = false;
}

function handleErrorStartLocal(error) {
  btnStartLocalVideo.disabled = false;
  console.error(error);
}

async function handleIceCandidate({ currentTarget, candidate }) {
  const otherConnection = currentTarget === sender ? receiver : sender;
  try {
    await otherConnection.addIceCandidate(candidate);
  } catch (e) {
    console.error(e);
  }
}

async function handleStartLocal() {
  btnStartLocalVideo.disabled = true;
  const cameraResolutions = Object.keys(videoConstraints);

  while (true) {
    try {
      const currentResolution = cameraResolutions.shift();
      const constraints = {
        audio: true,
        video: videoConstraints[currentResolution],
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      handleSuccessStartLocal(stream);
      break;
    } catch (e) {
      if (e.name !== 'OverconstrainedError') {
        handleErrorStartLocal(e);
        break;
      }
    }
  }
}

function handleTrack({ streams: [stream] }) {
  if (remote.srcObject !== stream) remote.srcObject = stream;
}

async function handleCall() {
  btnCall.disabled = true;
  const { srcObject: localStream } = local;

  sender = new RTCPeerConnection();
  sender.addEventListener('icecandidate', handleIceCandidate);

  receiver = new RTCPeerConnection();
  receiver.addEventListener('icecandidate', handleIceCandidate);
  receiver.addEventListener('track', handleTrack);

  localStream.getTracks().forEach(track => {
    sender.addTrack(track, localStream);
  });

  try {
    const offer = await sender.createOffer({ offerToReceiveAudio: 1, offerToReceiveVideo: 1 });
    await sender.setLocalDescription(offer);
    await receiver.setRemoteDescription(offer);

    const answer = await receiver.createAnswer();
    await receiver.setLocalDescription(answer);
    await sender.setRemoteDescription(answer);
  } catch (e) {
    console.error(e);
    btnCall.disabled = false;
  }
}
