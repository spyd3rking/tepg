const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

const languages = { en: 'ENG', id: 'IND' }

// Kamus translasi khusus untuk 1 Kategori Utama tunggal
const categoryMap = {
  'series': 'Pengetahuan',
  'entertainment': 'Hiburan',
  'documentary': 'Dokumenter',
  'infotainment': 'info hiburan',
  'movies': 'Film',
  'movie': 'Film',
  'news': 'Berita',
  'sports': 'Olahraga',
  'culture': 'Budaya',
  'music': 'Musik',
  'kids': 'Anak-Anak'
}

module.exports = {
  site: 'visionplus.id',
  days: 2,
  url({ date, channel }) {
    return `https://www.visionplus.id/managetv/tvinfo/events/schedule?language=${
      languages[channel.lang]
    }&serviceId=${channel.site_id}&start=${date.format('YYYY-MM-DD')}T00%3A00%3A00Z&end=${date
      .add(1, 'd')
      .format('YYYY-MM-DD')}T00%3A00%3A00Z&view=cd-events-grid-view`
  },
  parser({ content, channel }) {
    const programs = []
    const json = JSON.parse(content)
    if (Array.isArray(json.evs)) {
      for (const ev of json.evs) {
        if (ev.sid === channel.site_id) {
          const title = ev.con && ev.con.loc ? ev.con.loc[0].tit : ev.con.oti
          const [, , season, , episode] = title.match(/( S(\d+))?(, Ep (\d+))/) || [
            null,
            null,
            null,
            null,
            null
          ]
          programs.push({
            title,
            description: ev.con && ev.con.loc ? ev.con.loc[0].syn : null,
            categories: ev.con ? parseCategories(ev.con.categories) : null,
            season: season ? parseInt(season) : season,
            episode: episode ? parseInt(episode) : episode,
            start: dayjs(ev.sta),
            stop: dayjs(ev.end)
          })
        }
      }
    }

    return programs
  },
  async channels({ lang = 'id' }) {
    const result = []
    const axios = require('axios')
    const json = await axios
      .get(`https://www.visionplus.id/managetv/tvinfo/channels/get?language=${
        languages[lang]
      }&partition=IndonesiaPartition&region=Indonesia`)
      .then(response => response.data)
      .catch(console.error)

    if (Array.isArray(json?.chs)) {
      for (const ch of json.chs) {
        result.push({
          lang,
          site_id: ch.sid,
          name: ch.loc[0].nam
        })
      }
    }

    return result
  }
}

// Fungsi baru untuk mengekstrak hanya 1 kategori utama tunggal
function parseCategories(categories) {
  if (Array.isArray(categories) && categories.length > 0) {
    // 1. Ambil data string kategori pertama dari array bawaan API
    const firstCategory = categories[0] || ''
    
    // 2. Pecah string berdasarkan '/' untuk membuang sub-kategori, ambil bagian paling depan
    const mainCategory = firstCategory.split('/')[0].trim()
    const lowerCategory = mainCategory.toLowerCase()
    
    // 3. Terjemahkan kata menggunakan kamus kustom jika cocok
    const translatedCategory = categoryMap[lowerCategory] || mainCategory
    
    // Mengembalikan array berisi 1 teks kategori murni agar generator XMLTV memproses 1 tag saja
    return [translatedCategory]
  }

  return null
}
