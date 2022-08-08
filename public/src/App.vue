<script setup>
let api = 'http://localhost:3000'
if (import.meta.env.PROD) {
  api = ''
}

import Writer from './components/Writer.vue'
import Explorer from './components/Explorer.vue'

const text = ref('')
const explorer = ref()

let socket
const connect = () => {
  let wsApi
  if (api) wsApi = api.replace(/^http/, 'ws')
  else wsApi = location.origin.replace(/^http/, 'ws')

  const url = wsApi + '/api/ws/connect'
  socket = new WebSocket(url)

  socket.onopen = () => {
    console.log('Socket opened')
    socket.send(JSON.stringify({type: 'connect'}))
  }

  socket.onmessage = (event) => {
    const parsed = JSON.parse(event.data)
    if (parsed.type === 'update') text.value = parsed.value
    if (parsed.type === 'update-files') explorer.value.refresh()
  }

  socket.onclose = () => {
    setTimeout(function () {
      connect();
    }, 1000)
  }

  socket.onerror = (error) => {
    console.error('Socket error', error)
    socket.close()
  }
}

const updateText = async (value) => {
  text.value = value
  if (!socket) connect()
  socket.send(JSON.stringify({type: 'update', value}))
}

connect()
</script>

<template>
  <Writer :api="api" :text="text" @update-text="updateText" style="margin-bottom: 20px" />
  <Explorer ref="explorer" :api="api" style="margin-bottom: 20px" />
</template>
