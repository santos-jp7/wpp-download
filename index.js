const axios = require("axios");
const cheerio = require('cheerio');
const fs = require("fs");
const progress = require("progress");

const medias_list = [];
const page_limit = 10;

const downloads = "./downloads"

function getId(val){
    return val.split("_")[1];
}

async function getDownloadLink(id, image_server, file_format){
    try{
        const {data} = await axios.post(
            "https://api.alphacoders.com/content/get-download-link",
            `content_id=${id}&content_type=wallpaper&file_type=${file_format}&image_server=${image_server}`
        );

        return data.link;
    }catch(e){
        console.log(e.message);
    }
}

async function downloadPipe(){
    const {download_link, id, file_format, thumb_id} = medias_list.shift();

    try{
        const file = `${downloads}/${id}.${file_format}`;

        const {data, headers} =  await axios({
            method: 'get',
            url: download_link,
            responseType: 'stream'
        });

        const totalLength = headers['content-length'];

        // console.log(`[+] ${thumb_id}: Download...`);

        const progressBar = new progress('-> downloading [:bar] :percent :etas\n\n\n', {
            width: 40,
            complete: '=',
            incomplete: ' ',
            renderThrottle: 1,
            total: parseInt(totalLength)
          })

        data.on('data', (chunk) => {
            progressBar.tick(chunk.length);

            console.log(`[+] ${thumb_id} Complete`);

            if(chunk >= totalLength) return downloadPipe();
        });

        data.pipe(file);
    }catch(e){
        console.log(e.message);
    }
}

async function getMedias(page = 1){
    const {data} = await axios.get("https://wall.alphacoders.com/by_resolution.php?w=8000&h=4500&lang=Portuguese&page="+page);

    const $ = cheerio.load(data);

    const medias_el = $("#page_container > div:nth-child(6) .thumb-container-big");
    
    medias_el.each(async function(index){
        const thumb_id = this.attribs.id;
        // console.log(`[+] ${thumb_id}: Init!`);
        
        const id = getId(thumb_id);
        // console.log(`[+] ${thumb_id}: GetId -> ${id}`);

        const media = cheerio.load(this);
        const img_el = media('picture img')[0];
        const img_src = img_el.attribs.src;

        const image_server = img_src.split("https://")[1].split(".")[0];
        // console.log(`[+] ${thumb_id}: ImageServer -> ${image_server}`);

        const file_format = img_src.split(".").pop();
        // console.log(`[+] ${thumb_id}: FileFormat -> ${file_format}`);

        const download_link = await getDownloadLink(id, image_server, file_format);
        // console.log(`[+] ${thumb_id}: DownloadLink -> ${download_link}`);

        return medias_list.push({
            download_link,
            thumb_id,
            file_format,
            thumb_id
        })
    })
}

let i = 2;

getMedias();
setInterval(() => {
    getMedias(i);

    i++;
}, 3000);

setTimeout(() => {
    downloadPipe();
}, 5000);