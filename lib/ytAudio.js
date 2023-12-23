const ytdl = require('ytdl-core')
const ffmpeg = require('ffmpeg-static')
const contentDisposition = require('content-disposition');
const spawn = require('child_process').spawn;

var express = require('express');
var app = module.exports = express();

app.get('/download', async (req, res) => {
    var URL = req.query.url;
    URL = fixURL(URL);

    try {
        let info = await ytdl.getInfo(URL);
        var title = info.videoDetails.title;
        // Remove characters that cause errors
        title = title.replace(/[\'\\\/\|\"]/g, '');

        var thumbnailURL = info.videoDetails.thumbnails[0].url; // Get the first thumbnail URL

        const audio = ytdl(URL, { filter: 'audioonly', quality: 'highestaudio' })

        res.writeHead(200, {
            'Content-Type': 'audio/mpeg',
            'Content-disposition': contentDisposition(`${title}.mp3`),
            'Content-poster': thumbnailURL, // Set the poster URL in the response headers
        });

        const ffmpegProcess = spawn(ffmpeg, [
            '-loglevel', '8', '-hide_banner',
            '-i', 'pipe:3',
            '-c:a', 'libmp3lame',
            '-b:a', '128k',
            '-i', thumbnailURL, // Add thumbnail as an input
            '-metadata', `title="${title}"`, '-metadata', `artist="${info.videoDetails.ownerChannelName}"`,
            '-map', '0', '-map', '1', // Map audio and thumbnail streams
            '-f', 'mp3', 'pipe:4',
        ], {
            windowsHide: true,
            stdio: [
                'inherit', 'inherit', 'inherit',
                'pipe', 'pipe', 'pipe',
            ],
        });

        audio.pipe(ffmpegProcess.stdio[3]);
        ffmpegProcess.stdio[4].pipe(res);
    } catch (err) {
        console.log(err);
    }
});

function fixURL(url) {
    let fixed = 'https://youtube.com/watch?v=';
    if (url.startsWith('https://youtu.be/')) {
        for (var i = 17; i < url.length; i++) {
            if (url[i] == '?') {
                break;
            }
            fixed = fixed + url[i];
        }
    } else {
        fixed = url;
    }
    console.log('Downloading: ' + fixed);
    return fixed;
}
