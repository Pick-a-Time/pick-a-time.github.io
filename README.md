# Pick a Time

A simple Doodle-style group scheduling poll with the Frog Baby character.

- Create a poll: title, organizer, location, length, base time zone, candidate dates and times, optional deadline.
- Share one link. Participants answer without signing in (Yes / If need be / No) and see every time in their own time zone.
- The best times rise to the top. The organizer confirms one, and everyone can add it to Google Calendar or download an .ics file.
- 7 languages: 한국어, English, 日本語, 中文, Español, Français, Deutsch.

Live site: https://hyeonhoyu.github.io/Pick-a-Time/

## How it stores data

Firebase Realtime Database (same project as ClassLive), under `pickatime/polls/<pollId>`:

- `meta`: the poll (title, slots, status, confirmed slot, admin key hash)
- `responses/<responseId>`: `{ name, answers, updatedAt }`

The organizer's admin key never leaves their browser and admin link; only its SHA-256 hash is stored.
Participants can edit their own answers from the same browser.

If the page can't reach Firebase, check that the database rules allow this path, for example:

```json
{
  "rules": {
    "rooms": { ".read": true, ".write": true },
    "pickatime": {
      "polls": {
        "$pid": { ".read": true, ".write": true }
      }
    }
  }
}
```

(Keep whatever rule ClassLive already uses for `rooms`.)

If the Firebase scripts fail to load at all, the page runs in demo mode and saves to the current browser only.

## Credits

Frog Baby character art by Dr. Henry Yu. [Buy me a coffee](https://buymeacoffee.com/henryyu)
