## Connecting Account

[](https://www.npmjs.com/package/baileys#connecting-account)

WhatsApp provides a multi-device API that allows Baileys to be authenticated as a second WhatsApp client by scanning a **QR code** or **Pairing Code** with WhatsApp on your phone.

> [!NOTE]
> **[Here](https://www.npmjs.com/package/baileys#example-to-start) is a simple example of event handling**

> [!TIP]
> **You can see all supported socket configs in the [SocketConfig type alias](https://baileys.wiki/docs/api/type-aliases/SocketConfig/) (Recommended)**

### Starting socket with **QR-CODE**

[](https://www.npmjs.com/package/baileys#starting-socket-with-qr-code)

> [!TIP]
> You can customize browser name if you connect with **QR-CODE** , with `Browser` constant, we have some browsers config, **see the [BrowsersMap type alias](https://baileys.wiki/docs/api/type-aliases/BrowsersMap/)**

```ts
import makeWASocket from "@whiskeysockets/baileys";

const sock = makeWASocket({
  // can provide additional config here
  browser: Browsers.ubuntu("My App"),
  printQRInTerminal: true,
});
```

If the connection is successful, you will see a QR code printed on
your terminal screen, scan it with WhatsApp on your phone and you'll be
logged in!

### Starting socket with **Pairing Code**

[](https://www.npmjs.com/package/baileys#starting-socket-with-pairing-code)

> [!IMPORTANT]
> Pairing Code isn't Mobile API, it's a method to connect Whatsapp Web without QR-CODE, you can connect only with one device, see [here](https://faq.whatsapp.com/1324084875126592/?cms_platform=web)

The phone number can't have `+` or `()` or `-`, only numbers, you must provide country code

```ts
import makeWASocket from "@whiskeysockets/baileys";

const sock = makeWASocket({
  // can provide additional config here
  printQRInTerminal: false, //need to be false
});

if (!sock.authState.creds.registered) {
  const number = "XXXXXXXXXXX";
  const code = await sock.requestPairingCode(number);
  console.log(code);
}
```

### Receive Full History

[](https://www.npmjs.com/package/baileys#receive-full-history)

1. Set `syncFullHistory` as `true`
2. Baileys, by default, use chrome browser config
   - If you'd like to emulate a desktop connection (and receive more message history), this browser setting to your Socket config:

```ts
const sock = makeWASocket({
  ...otherOpts,
  // can use Windows, Ubuntu here too
  browser: Browsers.macOS("Desktop"),
  syncFullHistory: true,
});
```

## Important Notes About Socket Config

[](https://www.npmjs.com/package/baileys#important-notes-about-socket-config)

### Caching Group Metadata (Recommended)

[](https://www.npmjs.com/package/baileys#caching-group-metadata-recommended)

- If you use baileys for groups, we recommend you to set `cachedGroupMetadata` in socket config, you need to implement a cache like this:

  ```ts
  const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });

  const sock = makeWASocket({
    cachedGroupMetadata: async (jid) => groupCache.get(jid),
  });

  sock.ev.on("groups.update", async ([event]) => {
    const metadata = await sock.groupMetadata(event.id);
    groupCache.set(event.id, metadata);
  });

  sock.ev.on("group-participants.update", async (event) => {
    const metadata = await sock.groupMetadata(event.id);
    groupCache.set(event.id, metadata);
  });
  ```

### Improve Retry System & Decrypt Poll Votes

[](https://www.npmjs.com/package/baileys#improve-retry-system--decrypt-poll-votes)

- If you want to improve sending message, retrying when error occurs and decrypt poll votes, you need to have a store and set `getMessage` config in socket like this:
  ```ts
  const sock = makeWASocket({
    getMessage: async (key) => await getMessageFromStore(key),
  });
  ```

### Receive Notifications in Whatsapp App

[](https://www.npmjs.com/package/baileys#receive-notifications-in-whatsapp-app)

- If you want to receive notifications in whatsapp app, set `markOnlineOnConnect` to `false`
  ```ts
  const sock = makeWASocket({
    markOnlineOnConnect: false,
  });
  ```

## Saving & Restoring Sessions

[](https://www.npmjs.com/package/baileys#saving--restoring-sessions)

You obviously don't want to keep scanning the QR code every time you want to connect.

So, you can load the credentials to log back in:

```ts
import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys";

const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

// will use the given state to connect
// so if valid credentials are available -- it'll connect without QR
const sock = makeWASocket({ auth: state });

// this will be called as soon as the credentials are updated
sock.ev.on("creds.update", saveCreds);
```

> [!IMPORTANT]
> `useMultiFileAuthState` is a utility function to help save
> the auth state in a single folder, this function serves as a good guide
> to help write auth & key states for SQL/no-SQL databases, which I
> would recommend in any production grade system.

> [!NOTE]
> When a message is received/sent, due to signal sessions needing updating, the auth keys (`authState.keys`) will update. Whenever that happens, you must save the updated keys (`authState.keys.set()` is called). Not doing so will prevent your messages from reaching the recipient & cause other unexpected consequences. The `useMultiFileAuthState`
> function automatically takes care of that, but for any other serious
> implementation -- you will need to be very careful with the key state
> management.

## Handling Events

[](https://www.npmjs.com/package/baileys#handling-events)

- Baileys uses the EventEmitter syntax for events.
  They're all nicely typed up, so you shouldn't have any issues with an Intellisense editor like VS Code.

> [!IMPORTANT]
> **The events are in the [BaileysEventMap type alias](https://baileys.wiki/docs/api/type-aliases/BaileysEventMap/)** , it's important you see all events

You can listen to these events like this:

```ts
const sock = makeWASocket();
sock.ev.on("messages.upsert", ({ messages }) => {
  console.log("got messages", messages);
});
```

### Example to Start

[](https://www.npmjs.com/package/baileys#example-to-start)

> [!NOTE]
> This example includes basic auth storage too

> [!NOTE]
> For reliable serialization of the authentication state, especially when storing as JSON, always use the BufferJSON utility.

```ts
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  const sock = makeWASocket({
    // can provide additional config here
    auth: state,
    printQRInTerminal: true,
  });
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log(
        "connection closed due to ",
        lastDisconnect.error,
        ", reconnecting ",
        shouldReconnect,
      );
      // reconnect if not logged out
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      console.log("opened connection");
    }
  });
  sock.ev.on("messages.upsert", (event) => {
    for (const m of event.messages) {
      console.log(JSON.stringify(m, undefined, 2));

      console.log("replying to", m.key.remoteJid);
      await sock.sendMessage(m.key.remoteJid!, { text: "Hello Word" });
    }
  });

  // to storage creds (session info) when it updates
  sock.ev.on("creds.update", saveCreds);
}
// run in main file
connectToWhatsApp();
```

> [!IMPORTANT]
> In `messages.upsert` it's recommended to use a loop like `for (const message of event.messages)` to handle all messages in array

### Decrypt Poll Votes

[](https://www.npmjs.com/package/baileys#decrypt-poll-votes)

- By default poll votes are encrypted and handled in `messages.update`
- That's a simple example

```ts
sock.ev.on("messages.update", (event) => {
  for (const { key, update } of event) {
    if (update.pollUpdates) {
      const pollCreation = await getMessage(key);
      if (pollCreation) {
        console.log(
          "got poll update, aggregation: ",
          getAggregateVotesInPollMessage({
            message: pollCreation,
            pollUpdates: update.pollUpdates,
          }),
        );
      }
    }
  }
});
```

- `getMessage` is a [store](https://www.npmjs.com/package/baileys#implementing-a-data-store) implementation (in your end)

### Summary of Events on First Connection

[](https://www.npmjs.com/package/baileys#summary-of-events-on-first-connection)

1. When you connect first time, `connection.update` will be fired requesting you to restart sock
2. Then, history messages will be received in `messaging.history-set`

## Implementing a Data Store

[](https://www.npmjs.com/package/baileys#implementing-a-data-store)

- Baileys does not come with a defacto storage for chats, contacts, or
  messages. However, a simple in-memory implementation has been provided.
  The store listens for chat updates, new messages, message updates,
  etc., to always have an up-to-date version of the data.

> [!IMPORTANT]
> I highly recommend building your own data store, as storing someone's entire chat history in memory is a terrible waste of RAM.

It can be used as follows:

```ts
import makeWASocket, { makeInMemoryStore } from "@whiskeysockets/baileys";
// the store maintains the data of the WA connection in memory
// can be written out to a file & read from it
const store = makeInMemoryStore({});
// can be read from a file
store.readFromFile("./baileys_store.json");
// saves the state to a file every 10s
setInterval(() => {
  store.writeToFile("./baileys_store.json");
}, 10_000);

const sock = makeWASocket({});
// will listen from this socket
// the store can listen from a new socket once the current socket outlives its lifetime
store.bind(sock.ev);

sock.ev.on("chats.upsert", () => {
  // can use 'store.chats' however you want, even after the socket dies out
  // 'chats' => a KeyedDB instance
  console.log("got chats", store.chats.all());
});

sock.ev.on("contacts.upsert", () => {
  console.log("got contacts", Object.values(store.contacts));
});
```

The store also provides some simple functions such as `loadMessages` that utilize the store to speed up data retrieval.

## Whatsapp IDs Explain

[](https://www.npmjs.com/package/baileys#whatsapp-ids-explain)

- `id` is the WhatsApp ID, called `jid` too, of the person or group you're sending the message to.
- It must be in the format `[country code][phone number]@s.whatsapp.net`
  - Example for people: `+19999999999@s.whatsapp.net`.
  - For groups, it must be in the format `123456789-123345@g.us`.
- For broadcast lists, it's `[timestamp of creation]@broadcast`.
- For stories, the ID is `status@broadcast`.

## Utility Functions

[](https://www.npmjs.com/package/baileys#utility-functions)

- `getContentType`, returns the content type for any message
- `getDevice`, returns the device from message
- `makeCacheableSignalKeyStore`, make auth store more fast
- `downloadContentFromMessage`, download content from any message

## Sending Messages

[](https://www.npmjs.com/package/baileys#sending-messages)

- Send all types of messages with a single function
  - **In the [AnyMessageContent type alias](https://baileys.wiki/docs/api/type-aliases/AnyMessageContent/) you can see all message contents supported, like text message**
  - **In the [MiscMessageGenerationOptions type alias](https://baileys.wiki/docs/api/type-aliases/MiscMessageGenerationOptions/) you can see all options supported, like quote message**

  ```ts
  const jid: string;
  const content: AnyMessageContent;
  const options: MiscMessageGenerationOptions;

  sock.sendMessage(jid, content, options);
  ```

### Non-Media Messages

[](https://www.npmjs.com/package/baileys#non-media-messages)

#### Text Message

[](https://www.npmjs.com/package/baileys#text-message)

```ts
await sock.sendMessage(jid, { text: "hello word" });
```

#### Quote Message (works with all types)

[](https://www.npmjs.com/package/baileys#quote-message-works-with-all-types)

```ts
await sock.sendMessage(jid, { text: "hello word" }, { quoted: message });
```

#### Mention User (works with most types)

[](https://www.npmjs.com/package/baileys#mention-user-works-with-most-types)

- @number is to mention in text, it's optional

```ts
await sock.sendMessage(jid, {
  text: "@12345678901",
  mentions: ["12345678901@s.whatsapp.net"],
});
```

#### Forward Messages

[](https://www.npmjs.com/package/baileys#forward-messages)

- You need to have message object, can be retrieved from [store](https://www.npmjs.com/package/baileys#implementing-a-data-store) or use a [message](https://baileys.wiki/docs/api/type-aliases/WAMessage/) object

```ts
const msg = getMessageFromStore(); // implement this on your end
await sock.sendMessage(jid, { forward: msg }); // WA forward the message!
```

#### Location Message

[](https://www.npmjs.com/package/baileys#location-message)

```ts
await sock.sendMessage(jid, {
  location: {
    degreesLatitude: 24.121231,
    degreesLongitude: 55.1121221,
  },
});
```

#### Contact Message

[](https://www.npmjs.com/package/baileys#contact-message)

```ts
const vcard =
  "BEGIN:VCARD\n" + // metadata of the contact card
  "VERSION:3.0\n" +
  "FN:Jeff Singh\n" + // full name
  "ORG:Ashoka Uni;\n" + // the organization of the contact
  "TEL;type=CELL;type=VOICE;waid=911234567890:+91 12345 67890\n" + // WhatsApp ID + phone number
  "END:VCARD";

await sock.sendMessage(id, {
  contacts: {
    displayName: "Jeff",
    contacts: [{ vcard }],
  },
});
```

#### Reaction Message

[](https://www.npmjs.com/package/baileys#reaction-message)

- You need to pass the key of message, you can retrieve from [store](https://www.npmjs.com/package/baileys#implementing-a-data-store) or use a [key](https://baileys.wiki/docs/api/type-aliases/WAMessageKey/) object

```ts
await sock.sendMessage(jid, {
  react: {
    text: "💖", // use an empty string to remove the reaction
    key: message.key,
  },
});
```

#### Pin Message

[](https://www.npmjs.com/package/baileys#pin-message)

- You need to pass the key of message, you can retrieve from [store](https://www.npmjs.com/package/baileys#implementing-a-data-store) or use a [key](https://baileys.wiki/docs/api/type-aliases/WAMessageKey/) object
- Time can be:

| Time | Seconds   |
| ---- | --------- |
| 24h  | 86.400    |
| 7d   | 604.800   |
| 30d  | 2.592.000 |

```ts
await sock.sendMessage(
    jid,
    {
        pin: {
            type: 1, // 0 to remove
            time: 86400
            key: message.key
        }
    }
)
```

#### Poll Message

[](https://www.npmjs.com/package/baileys#poll-message)

```ts
await sock.sendMessage(
    jid,
    {
        poll: {
            name: 'My Poll',
            values: ['Option 1', 'Option 2', ...],
            selectableCount: 1,
            toAnnouncementGroup: false // or true
        }
    }
)
```

### Sending Messages with Link Previews

[](https://www.npmjs.com/package/baileys#sending-messages-with-link-previews)

1. By default, wa does not have link generation when sent from the web
2. Baileys has a function to generate the content for these link previews
3. To enable this function's usage, add `link-preview-js` as a dependency to your project with `yarn add link-preview-js`
4. Send a link:

```ts
await sock.sendMessage(jid, {
  text: "Hi, this was sent using https://github.com/whiskeysockets/baileys",
});
```

### Media Messages

[](https://www.npmjs.com/package/baileys#media-messages)

Sending media (video, stickers, images) is easier & more efficient than ever.

> [!NOTE]
> In media messages, you can pass `{ stream: Stream }` or `{ url: Url }` or `Buffer` directly, you can see more in the [WAMediaUpload type alias](https://baileys.wiki/docs/api/type-aliases/WAMediaUpload/)

- When specifying a media url, Baileys never loads the entire buffer into memory; it even encrypts the media as a readable stream.

> [!TIP]
> It's recommended to use Stream or Url to save memory

#### Gif Message

[](https://www.npmjs.com/package/baileys#gif-message)

- Whatsapp doesn't support `.gif` files, that's why we send gifs as common `.mp4` video with `gifPlayback` flag

```ts
await sock.sendMessage(jid, {
  video: fs.readFileSync("Media/ma_gif.mp4"),
  caption: "hello word",
  gifPlayback: true,
});
```

#### Video Message

[](https://www.npmjs.com/package/baileys#video-message)

```ts
await sock.sendMessage(id, {
  video: {
    url: "./Media/ma_gif.mp4",
  },
  caption: "hello word",
  ptv: false, // if set to true, will send as a `video note`
});
```

#### Audio Message

[](https://www.npmjs.com/package/baileys#audio-message)

- To audio message work in all devices you need to convert with some tool like `ffmpeg` with this flags:

  ```shell
      codec: libopus //ogg file
      ac: 1 //one channel
      avoid_negative_ts
      make_zero
  ```

  - Example:

  ```shell
  ffmpeg -i input.mp4 -avoid_negative_ts make_zero -ac 1 output.ogg
  ```

```ts
await sock.sendMessage(jid, {
  audio: {
    url: "./Media/audio.mp3",
  },
  mimetype: "audio/mp4",
});
```

#### Image Message

[](https://www.npmjs.com/package/baileys#image-message)

```ts
await sock.sendMessage(id, {
  image: {
    url: "./Media/ma_img.png",
  },
  caption: "hello word",
});
```

#### View Once Message

[](https://www.npmjs.com/package/baileys#view-once-message)

- You can send all messages above as `viewOnce`, you only need to pass `viewOnce: true` in content object

```ts
await sock.sendMessage(id, {
  image: {
    url: "./Media/ma_img.png",
  },
  viewOnce: true, //works with video, audio too
  caption: "hello word",
});
```

## Modify Messages

[](https://www.npmjs.com/package/baileys#modify-messages)

### Deleting Messages (for everyone)

[](https://www.npmjs.com/package/baileys#deleting-messages-for-everyone)

```ts
const msg = await sock.sendMessage(jid, { text: "hello word" });
await sock.sendMessage(jid, { delete: msg.key });
```

**Note:** deleting for oneself is supported via `chatModify`, see in [this section](https://www.npmjs.com/package/baileys#modifying-chats)

### Editing Messages

[](https://www.npmjs.com/package/baileys#editing-messages)

- You can pass all editable contents here

```ts
await sock.sendMessage(jid, {
  text: "updated text goes here",
  edit: response.key,
});
```

## Manipulating Media Messages

[](https://www.npmjs.com/package/baileys#manipulating-media-messages)

### Thumbnail in Media Messages

[](https://www.npmjs.com/package/baileys#thumbnail-in-media-messages)

- For media messages, the thumbnail can be generated automatically for images & stickers provided you add `jimp` or `sharp` as a dependency in your project using `yarn add jimp` or `yarn add sharp`.
- Thumbnails for videos can also be generated automatically, though, you need to have `ffmpeg` installed on your system.

### Downloading Media Messages

[](https://www.npmjs.com/package/baileys#downloading-media-messages)

If you want to save the media you received

```ts
import { createWriteStream } from 'fs'
import { downloadMediaMessage, getContentType } from '@whiskeysockets/baileys'

sock.ev.on('messages.upsert', async ({ [m] }) => {
    if (!m.message) return // if there is no text or media message
    const messageType = getContentType(m) // get what type of message it is (text, image, video...)

    // if the message is an image
    if (messageType === 'imageMessage') {
        // download the message
        const stream = await downloadMediaMessage(
            m,
            'stream', // can be 'buffer' too
            { },
            {
                logger,
                // pass this so that baileys can request a reupload of media
                // that has been deleted
                reuploadRequest: sock.updateMediaMessage
            }
        )
        // save to file
        const writeStream = createWriteStream('./my-download.jpeg')
        stream.pipe(writeStream)
    }
}
```

### Re-upload Media Message to Whatsapp

[](https://www.npmjs.com/package/baileys#re-upload-media-message-to-whatsapp)

- WhatsApp automatically removes old media from their servers. For the
  device to access said media -- a re-upload is required by another
  device that has it. This can be accomplished using:

```ts
await sock.updateMediaMessage(msg);
```

## Reject Call

[](https://www.npmjs.com/package/baileys#reject-call)

- You can obtain `callId` and `callFrom` from `call` event

```ts
await sock.rejectCall(callId, callFrom);
```

## Send States in Chat

[](https://www.npmjs.com/package/baileys#send-states-in-chat)

### Reading Messages

[](https://www.npmjs.com/package/baileys#reading-messages)

- A set of message [keys](https://baileys.wiki/docs/api/type-aliases/WAMessageKey/) must be explicitly marked read now.
- You cannot mark an entire 'chat' read as it were with Baileys Web.
  This means you have to keep track of unread messages.

```ts
const key: WAMessageKey;
// can pass multiple keys to read multiple messages as well
await sock.readMessages([key]);
```

The message ID is the unique identifier of the message that you are marking as read.
On a `WAMessage`, the `messageID` can be accessed using `messageID = message.key.id`.

### Update Presence

[](https://www.npmjs.com/package/baileys#update-presence)

- `presence` can be one of the values in the [WAPresence type alias](https://baileys.wiki/docs/api/type-aliases/WAPresence/)
- The presence expires after about 10 seconds.
- This lets the person/group with `jid` know whether you're online, offline, typing etc.

```ts
await sock.sendPresenceUpdate("available", jid);
```

> [!NOTE]
> If a desktop client is active, WA doesn't send push notifications to the
> device. If you would like to receive said notifications -- mark your
> Baileys client offline using `sock.sendPresenceUpdate('unavailable')`

## Modifying Chats

[](https://www.npmjs.com/package/baileys#modifying-chats)

WA uses an encrypted form of communication to send chat/app updates.
This has been implemented mostly and you can send the following updates:

> [!IMPORTANT]
> If you mess up one of your updates, WA can log you out of all your devices and you'll have to log in again.

### Archive a Chat

[](https://www.npmjs.com/package/baileys#archive-a-chat)

```ts
const lastMsgInChat = await getLastMessageInChat(jid); // implement this on your end
await sock.chatModify({ archive: true, lastMessages: [lastMsgInChat] }, jid);
```

### Mute/Unmute a Chat

[](https://www.npmjs.com/package/baileys#muteunmute-a-chat)

- Supported times:

| Time   | Miliseconds |
| ------ | ----------- |
| Remove | null        |
| 8h     | 86.400.000  |
| 7d     | 604.800.000 |

```ts
// mute for 8 hours
await sock.chatModify({ mute: 8 * 60 * 60 * 1000 }, jid);
// unmute
await sock.chatModify({ mute: null }, jid);
```

### Mark a Chat Read/Unread

[](https://www.npmjs.com/package/baileys#mark-a-chat-readunread)

```ts
const lastMsgInChat = await getLastMessageInChat(jid); // implement this on your end
// mark it unread
await sock.chatModify({ markRead: false, lastMessages: [lastMsgInChat] }, jid);
```

### Delete a Message for Me

[](https://www.npmjs.com/package/baileys#delete-a-message-for-me)

```ts
await sock.chatModify(
  {
    clear: {
      messages: [
        {
          id: "ATWYHDNNWU81732J",
          fromMe: true,
          timestamp: "1654823909",
        },
      ],
    },
  },
  jid,
);
```

### Delete a Chat

[](https://www.npmjs.com/package/baileys#delete-a-chat)

```ts
const lastMsgInChat = await getLastMessageInChat(jid); // implement this on your end
await sock.chatModify(
  {
    delete: true,
    lastMessages: [
      {
        key: lastMsgInChat.key,
        messageTimestamp: lastMsgInChat.messageTimestamp,
      },
    ],
  },
  jid,
);
```

### Pin/Unpin a Chat

[](https://www.npmjs.com/package/baileys#pinunpin-a-chat)

```ts
await sock.chatModify(
  {
    pin: true, // or `false` to unpin
  },
  jid,
);
```

### Star/Unstar a Message

[](https://www.npmjs.com/package/baileys#starunstar-a-message)

```ts
await sock.chatModify(
  {
    star: {
      messages: [
        {
          id: "messageID",
          fromMe: true, // or `false`
        },
      ],
      star: true, // - true: Star Message; false: Unstar Message
    },
  },
  jid,
);
```

### Disappearing Messages

[](https://www.npmjs.com/package/baileys#disappearing-messages)

- Ephemeral can be:

| Time   | Seconds   |
| ------ | --------- |
| Remove | 0         |
| 24h    | 86.400    |
| 7d     | 604.800   |
| 90d    | 7.776.000 |

- You need to pass in **Seconds** , default is 7 days

```ts
// turn on disappearing messages
await sock.sendMessage(
  jid,
  // this is 1 week in seconds -- how long you want messages to appear for
  { disappearingMessagesInChat: WA_DEFAULT_EPHEMERAL },
);

// will send as a disappearing message
await sock.sendMessage(
  jid,
  { text: "hello" },
  { ephemeralExpiration: WA_DEFAULT_EPHEMERAL },
);

// turn off disappearing messages
await sock.sendMessage(jid, { disappearingMessagesInChat: false });
```

## User Querys

[](https://www.npmjs.com/package/baileys#user-querys)

### Check If ID Exists in Whatsapp

[](https://www.npmjs.com/package/baileys#check-if-id-exists-in-whatsapp)

```ts
const [result] = await sock.onWhatsApp(jid);
if (result.exists)
  console.log(`${jid} exists on WhatsApp, as jid: ${result.jid}`);
```

### Query Chat History (groups too)

[](https://www.npmjs.com/package/baileys#query-chat-history-groups-too)

- You need to have oldest message in chat

```ts
const msg = await getOldestMessageInChat(jid); // implement this on your end
await sock.fetchMessageHistory(
  50, //quantity (max: 50 per query)
  msg.key,
  msg.messageTimestamp,
);
```

- Messages will be received in `messaging.history-set` event

### Fetch Status

[](https://www.npmjs.com/package/baileys#fetch-status)

```ts
const status = await sock.fetchStatus(jid);
console.log("status: " + status);
```

### Fetch Profile Picture (groups too)

[](https://www.npmjs.com/package/baileys#fetch-profile-picture-groups-too)

- To get the display picture of some person/group

```ts
// for low res picture
const ppUrl = await sock.profilePictureUrl(jid);
console.log(ppUrl);

// for high res picture
const ppUrl = await sock.profilePictureUrl(jid, "image");
```

### Fetch Bussines Profile (such as description or category)

[](https://www.npmjs.com/package/baileys#fetch-bussines-profile-such-as-description-or-category)

```ts
const profile = await sock.getBusinessProfile(jid);
console.log(
  "business description: " +
    profile.description +
    ", category: " +
    profile.category,
);
```

### Fetch Someone's Presence (if they're typing or online)

[](https://www.npmjs.com/package/baileys#fetch-someones-presence-if-theyre-typing-or-online)

```ts
// the presence update is fetched and called here
sock.ev.on("presence.update", console.log);

// request updates for a chat
await sock.presenceSubscribe(jid);
```

## Change Profile

[](https://www.npmjs.com/package/baileys#change-profile)

### Change Profile Status

[](https://www.npmjs.com/package/baileys#change-profile-status)

```ts
await sock.updateProfileStatus("Hello World!");
```

### Change Profile Name

[](https://www.npmjs.com/package/baileys#change-profile-name)

```ts
await sock.updateProfileName("My name");
```

### Change Display Picture (groups too)

[](https://www.npmjs.com/package/baileys#change-display-picture-groups-too)

- To change your display picture or a group's

> [!NOTE]
> Like media messages, you can pass `{ stream: Stream }` or `{ url: Url }` or `Buffer` directly, you can see more in the [WAMediaUpload type alias](https://baileys.wiki/docs/api/type-aliases/WAMediaUpload/)

```ts
await sock.updateProfilePicture(jid, { url: "./new-profile-picture.jpeg" });
```

### Remove display picture (groups too)

[](https://www.npmjs.com/package/baileys#remove-display-picture-groups-too)

```ts
await sock.removeProfilePicture(jid);
```

## Groups

[](https://www.npmjs.com/package/baileys#groups)

- To change group properties you need to be admin

### Create a Group

[](https://www.npmjs.com/package/baileys#create-a-group)

```ts
// title & participants
const group = await sock.groupCreate("My Fab Group", [
  "1234@s.whatsapp.net",
  "4564@s.whatsapp.net",
]);
console.log("created group with id: " + group.gid);
await sock.sendMessage(group.id, { text: "hello there" }); // say hello to everyone on the group
```

### Add/Remove or Demote/Promote

[](https://www.npmjs.com/package/baileys#addremove-or-demotepromote)

```ts
// id & people to add to the group (will throw error if it fails)
await sock.groupParticipantsUpdate(
  jid,
  ["abcd@s.whatsapp.net", "efgh@s.whatsapp.net"],
  "add", // replace this parameter with 'remove' or 'demote' or 'promote'
);
```

### Change Subject (name)

[](https://www.npmjs.com/package/baileys#change-subject-name)

```ts
await sock.groupUpdateSubject(jid, "New Subject!");
```

### Change Description

[](https://www.npmjs.com/package/baileys#change-description)

```ts
await sock.groupUpdateDescription(jid, "New Description!");
```

### Change Settings

[](https://www.npmjs.com/package/baileys#change-settings)

```ts
// only allow admins to send messages
await sock.groupSettingUpdate(jid, "announcement");
// allow everyone to send messages
await sock.groupSettingUpdate(jid, "not_announcement");
// allow everyone to modify the group's settings -- like display picture etc.
await sock.groupSettingUpdate(jid, "unlocked");
// only allow admins to modify the group's settings
await sock.groupSettingUpdate(jid, "locked");
```

### Leave a Group

[](https://www.npmjs.com/package/baileys#leave-a-group)

```ts
// will throw error if it fails
await sock.groupLeave(jid);
```

### Get Invite Code

[](https://www.npmjs.com/package/baileys#get-invite-code)

- To create link with code use `'https://chat.whatsapp.com/' + code`

```ts
const code = await sock.groupInviteCode(jid);
console.log("group code: " + code);
```

### Revoke Invite Code

[](https://www.npmjs.com/package/baileys#revoke-invite-code)

```ts
const code = await sock.groupRevokeInvite(jid);
console.log("New group code: " + code);
```

### Join Using Invitation Code

[](https://www.npmjs.com/package/baileys#join-using-invitation-code)

- Code can't have `https://chat.whatsapp.com/`, only code

```ts
const response = await sock.groupAcceptInvite(code);
console.log("joined to: " + response);
```

### Get Group Info by Invite Code

[](https://www.npmjs.com/package/baileys#get-group-info-by-invite-code)

```ts
const response = await sock.groupGetInviteInfo(code);
console.log("group information: " + response);
```

### Query Metadata (participants, name, description...)

[](https://www.npmjs.com/package/baileys#query-metadata-participants-name-description)

```ts
const metadata = await sock.groupMetadata(jid);
console.log(
  metadata.id +
    ", title: " +
    metadata.subject +
    ", description: " +
    metadata.desc,
);
```

### Join using `groupInviteMessage`

[](https://www.npmjs.com/package/baileys#join-using-groupinvitemessage)

```ts
const response = await sock.groupAcceptInviteV4(jid, groupInviteMessage);
console.log("joined to: " + response);
```

### Get Request Join List

[](https://www.npmjs.com/package/baileys#get-request-join-list)

```ts
const response = await sock.groupRequestParticipantsList(jid);
console.log(response);
```

### Approve/Reject Request Join

[](https://www.npmjs.com/package/baileys#approvereject-request-join)

```ts
const response = await sock.groupRequestParticipantsUpdate(
  jid, // group id
  ["abcd@s.whatsapp.net", "efgh@s.whatsapp.net"],
  "approve", // or 'reject'
);
console.log(response);
```

### Get All Participating Groups Metadata

[](https://www.npmjs.com/package/baileys#get-all-participating-groups-metadata)

```ts
const response = await sock.groupFetchAllParticipating();
console.log(response);
```

### Toggle Ephemeral

[](https://www.npmjs.com/package/baileys#toggle-ephemeral)

- Ephemeral can be:

| Time   | Seconds   |
| ------ | --------- |
| Remove | 0         |
| 24h    | 86.400    |
| 7d     | 604.800   |
| 90d    | 7.776.000 |

```ts
await sock.groupToggleEphemeral(jid, 86400);
```

### Change Add Mode

[](https://www.npmjs.com/package/baileys#change-add-mode)

```ts
await sock.groupMemberAddMode(
  jid,
  "all_member_add", // or 'admin_add'
);
```

## Privacy

[](https://www.npmjs.com/package/baileys#privacy)

### Block/Unblock User

[](https://www.npmjs.com/package/baileys#blockunblock-user)

```ts
await sock.updateBlockStatus(jid, "block"); // Block user
await sock.updateBlockStatus(jid, "unblock"); // Unblock user
```

### Get Privacy Settings

[](https://www.npmjs.com/package/baileys#get-privacy-settings)

```ts
const privacySettings = await sock.fetchPrivacySettings(true);
console.log("privacy settings: " + privacySettings);
```

### Get BlockList

[](https://www.npmjs.com/package/baileys#get-blocklist)

```ts
const response = await sock.fetchBlocklist();
console.log(response);
```

### Update LastSeen Privacy

[](https://www.npmjs.com/package/baileys#update-lastseen-privacy)

```ts
const value = "all"; // 'contacts' | 'contact_blacklist' | 'none'
await sock.updateLastSeenPrivacy(value);
```

### Update Online Privacy

[](https://www.npmjs.com/package/baileys#update-online-privacy)

```ts
const value = "all"; // 'match_last_seen'
await sock.updateOnlinePrivacy(value);
```

### Update Profile Picture Privacy

[](https://www.npmjs.com/package/baileys#update-profile-picture-privacy)

```ts
const value = "all"; // 'contacts' | 'contact_blacklist' | 'none'
await sock.updateProfilePicturePrivacy(value);
```

### Update Status Privacy

[](https://www.npmjs.com/package/baileys#update-status-privacy)

```ts
const value = "all"; // 'contacts' | 'contact_blacklist' | 'none'
await sock.updateStatusPrivacy(value);
```

### Update Read Receipts Privacy

[](https://www.npmjs.com/package/baileys#update-read-receipts-privacy)

```ts
const value = "all"; // 'none'
await sock.updateReadReceiptsPrivacy(value);
```

### Update Groups Add Privacy

[](https://www.npmjs.com/package/baileys#update-groups-add-privacy)

```ts
const value = "all"; // 'contacts' | 'contact_blacklist'
await sock.updateGroupsAddPrivacy(value);
```

### Update Default Disappearing Mode

[](https://www.npmjs.com/package/baileys#update-default-disappearing-mode)

- Like [this](https://www.npmjs.com/package/baileys#disappearing-messages), ephemeral can be:

| Time   | Seconds   |
| ------ | --------- |
| Remove | 0         |
| 24h    | 86.400    |
| 7d     | 604.800   |
| 90d    | 7.776.000 |

```ts
const ephemeral = 86400;
await sock.updateDefaultDisappearingMode(ephemeral);
```

## Broadcast Lists & Stories

[](https://www.npmjs.com/package/baileys#broadcast-lists--stories)

### Send Broadcast & Stories

[](https://www.npmjs.com/package/baileys#send-broadcast--stories)

- Messages can be sent to broadcasts & stories. You need to add the following message options in sendMessage, like this:

```ts
await sock.sendMessage(
  jid,
  {
    image: {
      url: url,
    },
    caption: caption,
  },
  {
    backgroundColor: backgroundColor,
    font: font,
    statusJidList: statusJidList,
    broadcast: true,
  },
);
```

- Message body can be a `extendedTextMessage` or `imageMessage` or `videoMessage` or `voiceMessage`, see the [AnyRegularMessageContent type alias](https://baileys.wiki/docs/api/type-aliases/AnyRegularMessageContent/)
- You can add `backgroundColor` and other options in the message options, see the [MiscMessageGenerationOptions type alias](https://baileys.wiki/docs/api/type-aliases/MiscMessageGenerationOptions/)
- `broadcast: true` enables broadcast mode
- `statusJidList`: a list of people that you can get which you need to provide, which are the people who will get this status message.
- You can send messages to broadcast lists the same way you send messages to groups & individual chats.
- Right now, WA Web does not support creating broadcast lists, but you can still delete them.
- Broadcast IDs are in the format `12345678@broadcast`

### Query a Broadcast List's Recipients & Name

[](https://www.npmjs.com/package/baileys#query-a-broadcast-lists-recipients--name)

```ts
const bList = await sock.getBroadcastListInfo("1234@broadcast");
console.log(`list name: ${bList.name}, recps: ${bList.recipients}`);
```

## Writing Custom Functionality

[](https://www.npmjs.com/package/baileys#writing-custom-functionality)

Baileys is written with custom functionality in mind. Instead of
forking the project & re-writing the internals, you can simply write
your own extensions.

### Enabling Debug Level in Baileys Logs

[](https://www.npmjs.com/package/baileys#enabling-debug-level-in-baileys-logs)

First, enable the logging of unhandled messages from WhatsApp by setting:

```ts
const sock = makeWASocket({
  logger: P({ level: "debug" }),
});
```

This will enable you to see all sorts of messages WhatsApp sends in the console.

### How Whatsapp Communicate With Us

[](https://www.npmjs.com/package/baileys#how-whatsapp-communicate-with-us)

> [!TIP]
> If you want to learn whatsapp protocol, we recommend to study about Libsignal Protocol and Noise Protocol

- **Example:** Functionality to track the battery percentage
  of your phone. You enable logging and you'll see a message about your
  battery pop up in the console:

```
  {
      "level": 10,
      "fromMe": false,
      "frame": {
          "tag": "ib",
          "attrs": {
              "from": "@s.whatsapp.net"
          },
          "content": [
              {
                  "tag": "edge_routing",
                  "attrs": {},
                  "content": [
                      {
                          "tag": "routing_info",
                          "attrs": {},
                          "content": {
                              "type": "Buffer",
                              "data": [8,2,8,5]
                          }
                      }
                  ]
              }
          ]
      },
      "msg":"communication"
  }
```

The `'frame'` is what the message received is, it has three components:

- `tag` -- what this frame is about (eg. message will have 'message')
- `attrs` -- a string key-value pair with some metadata (contains ID of the message usually)
- `content` -- the actual data (eg. a message node will have the actual message content in it)
- read more about this format [here](https://github.com/WhiskeySockets/Baileys/blob/HEAD/src/WABinary/readme.md)

### Register a Callback for Websocket Events

[](https://www.npmjs.com/package/baileys#register-a-callback-for-websocket-events)

> [!TIP]
> Recommended to see `onMessageReceived` function in `socket.ts` file to understand how websockets events are fired

```ts
// for any message with tag 'edge_routing'
sock.ws.on("CB:edge_routing", (node: BinaryNode) => {});

// for any message with tag 'edge_routing' and id attribute = abcd
sock.ws.on("CB:edge_routing,id:abcd", (node: BinaryNode) => {});

// for any message with tag 'edge_routing', id attribute = abcd & first content node routing_info
sock.ws.on("CB:edge_routing,id:abcd,routing_info", (node: BinaryNode) => {});
```
