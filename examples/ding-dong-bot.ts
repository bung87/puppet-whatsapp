/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import type * as PUPPET from 'wechaty-puppet'

import qrTerm from 'qrcode-terminal'

import { PuppetWhatsapp } from '../src/mod.js'
import { MemoryCard } from 'wechaty-puppet'

void (async () => {
  /**
 *
 * 1. Declare your Bot!
 *
 */
  const WHATSAPP_PUPPET_PROXY = process.env['WHATSAPP_PUPPET_PROXY']
  const memoryCard = new MemoryCard({
    name: 'session-file',
    storageOptions: { type: 'file' },
  })
  await memoryCard.load()
  console.info(memoryCard.get(MEMORY_SLOT))
  const defaultArgs = [
    '--no-sandbox',
    '--single-process',
    '--disable-dev-shm-usage',
    '--silent',
    '--no-first-run',
    '--cap-add=SYS_ADMIN',
    '--mute-audio',
    '--disable-gpu',
    '--no-zygote']
  const puppet = new PuppetWhatsapp(
    {
      memory: memoryCard,
      puppeteerOptions: {
        // clientId: '',
        puppeteer: {
          args: WHATSAPP_PUPPET_PROXY ? [`--proxy-server=${WHATSAPP_PUPPET_PROXY}`, ...defaultArgs] : defaultArgs,
          devtools: true,
          headless: false,
        },
        // userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3641.0 Safari/537.36',
      },
    },
  )

  /**
   *
   * 2. Register event handlers for Bot
   *
   */
  puppet
    .on('logout', onLogout)
    .on('login', onLogin)
    .on('login', onReady)
    .on('scan', onScan)
    .on('error', onError)
    .on('message', onMessage)

  /**
   *
   * 3. Start the bot!
   *
   */
  puppet.start()
    .catch(async e => {
      console.error('Bot start() fail:', e)
      await puppet.stop()
      // process.exit(-1)
    })

  /**
   *
   * 4. You are all set. ;-]
   *
   */

  /**
   *
   * 5. Define Event Handler Functions for:
   *  `scan`, `login`, `logout`, `error`, and `message`
   *
   */
  function onScan (payload: PUPPET.EventScanPayload) {
    if (payload.qrcode) {
      qrTerm.generate(payload.qrcode, { small: true })

      const qrcodeImageUrl = [
        'https://wechaty.js.org/qrcode/',
        payload.qrcode,
      ].join('')
      console.info(`[${payload.status}] ${qrcodeImageUrl}\nScan QR Code above to log in: `)
    } else {
      console.info(`[${payload.status}]`)
    }
  }

  function onLogin (payload: PUPPET.EventLoginPayload) {
    console.info(`${payload.contactId} login`)
  }

  async function onReady () {
    const contactList = await puppet.contactList()
    const roomList = await puppet.roomList()
    console.info(`ready contactList length: ${contactList.length} roomList length: ${roomList.length}`)
  }

  async function onLogout (payload: PUPPET.EventLogoutPayload) {
    console.info(`${payload.contactId} logouted`)
  }

  function onError (payload: PUPPET.EventErrorPayload) {
    console.error('Bot error:', payload.data)
    /*
    if (bot.logonoff()) {
      bot.say('Wechaty error: ' + e.message).catch(console.error)
    }
    */
  }

  /**
   *
   * 6. The most important handler is for:
   *    dealing with Messages.
   *
   */
  async function onMessage (payload: PUPPET.EventMessagePayload): Promise<void> {
    const msgPayload = await puppet.messagePayload(payload.messageId)
    console.info(`
  =========================================
  Message type: ${msgPayload.type}
  text: ${msgPayload.text}
  from: ${msgPayload.fromId}
  to: ${msgPayload.toId}
  room: ${msgPayload.roomId}
  =========================================
  `)
    if ((/ding/i.test(msgPayload.text || ''))) {
      const messageId = await puppet.messageSendText(msgPayload.roomId || msgPayload.fromId!, 'dong')
      console.info(`messageId: ${messageId}`)
    }

    if (msgPayload.text === 'room') {
      // const roomIdA = '16505033788@c.us'
      const roomIdB = '19085551012-1631040278@g.us'
      const roomPayload = await puppet.roomRawPayload(roomIdB)
      console.info(`roomPayload: ${JSON.stringify(roomPayload)}`)
      await puppet.messageSendText(roomIdB, 'ding-ding-dong-dong')
    }

    if (msgPayload.text === 'link') {
      await puppet.messageSendUrl(msgPayload.fromId!, {
        title: 'www.baidu.com',
        url: 'www.baidu.com',
      })
    }

    // if (msgPayload.roomId) {
    //   const roomRawPayload = await puppet.roomRawPayload(msgPayload.roomId)
    //   console.info(`roomRawPayload: ${JSON.stringify(roomRawPayload)}`)
    //   const roomPayload = await puppet.roomRawPayloadParser(roomRawPayload)
    //   console.info(`roomPayload: ${JSON.stringify(roomPayload)}`)
    //   const roomMemberList = await puppet.roomMemberList(msgPayload.roomId)
    //   console.info(`roomMemberList: ${JSON.stringify(roomMemberList)}`)
    // }

    if (msgPayload.text === 'all rooms') {
      const roomIdList = await puppet.roomList()
      for (const roomId of roomIdList) {
        const roomRawPayload = await puppet.roomRawPayload(roomId)
        // console.info(`roomRawPayload: ${JSON.stringify(roomRawPayload)}`)
        const roomPayload = await puppet.roomRawPayloadParser(roomRawPayload)
        console.info(`roomPayload: ${JSON.stringify(roomPayload)}`)
        const roomMemberList = await puppet.roomMemberList(roomId)
        console.info(`roomMemberList length: ${roomMemberList.length} ${JSON.stringify(roomMemberList)}`)
      }
    }

    if (msgPayload.text === 'all contacts') {
      const contactIdList = await puppet.contactList()
      for (const contactId of contactIdList) {
        const contactRawPayload = await puppet.contactRawPayload(contactId)
        const _contactRawPayload = await puppet.contactRawPayloadParser(contactRawPayload)
        console.info(`contactRawPayload: ${JSON.stringify(_contactRawPayload)}`)
      }
    }
  }

  /**
   *
   * 7. Output the Welcome Message
   *
   */
  const welcome = `
Puppet Version: ${puppet.version()}

Please wait... I'm trying to login in...

`
  console.info(welcome)
})()
