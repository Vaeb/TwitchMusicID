# TwitchMusicID

Identify music playing in Twitch clips.

- Scans a Twitch channel for clips.
  - Compensates for Twitch's current API issues (missing clips) by altering the API requests' time-period filter in cycles.
  - Stores a reference to each clip in the MongoDB database.
- Extracts the MP4 files from each clip.
- Creates audio fingerprints for each MP4 file.
- Uploads the audio fingerprints to ACRCloud for audio analysis.
- Alters the clips' db records based on the results.
  - If music is found, the db records include relevant data on the song (artist, title, label).

Frontend

- Frontend script provides a page to list a channel's music clips + unchecked clips.
- Allows for mass deletion of both types.
- Protects the streamer from DMCA strikes.

## Hidden Files
#### src/auth.json
```
{
    "clientId": "",
    "clientId2": "",
    "clientSecret": "",
    "accessToken": "",
    "expiryTimestamp": 0,
    "refreshToken": ""
}
```

#### src/hidden.js
```
export const host = '';
export const accessKey = '';
export const accessSecret = '';
```

#### src/mp4/ (Folder)
```
< Empty >
```

#### src/acrcloud_extr_(os)
```
ACRCloud Fingerprinting Tool
```
