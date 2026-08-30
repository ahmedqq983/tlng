// قايمة روابط RSS بتاعة المصادر - تقدر تضيف أو تشيل منها
const RSS_SOURCES = [
  // مواقع عامة
  "https://www.ign.com/rss",
  "https://www.eurogamer.net/feed",
  "https://www.pcgamer.com/rss/",
  "https://www.polygon.com/rss/index.xml",
  "https://kotaku.com/rss",
  "https://www.rockpapershotgun.com/feed",
  "https://gamerant.com/feed",
  "https://www.vg247.com/feed",
  "https://www.gamesradar.com/rss",
  "https://www.gamespot.com/feeds/mashup",
  "https://www.giantbomb.com/feeds/mashup",
  "https://www.thegamer.com/feed",
  "https://www.destructoid.com/feed",
  "https://www.pcgamesn.com/feed",
  "https://www.videogameschronicle.com/feed",
  "https://twinfinite.net/feed",
  "https://www.escapistmagazine.com/feed",
  "https://www.dexerto.com/feed",
  "https://dotesports.com/feed",
  "https://wccftech.com/feed",
  "https://www.siliconera.com/feed",
  "https://toucharcade.com/feed",
  "https://nichegamer.com/feed",
  "https://www.theverge.com/games/rss/index.xml",
  "https://feeds.arstechnica.com/arstechnica/gaming",
  "https://www.engadget.com/gaming/rss.xml",

  // أخبار الشركات (بيزنس الصناعة)
  "https://www.gamesindustry.biz/feed/news",

  // PlayStation
  "https://blog.playstation.com/feed",
  "https://www.pushsquare.com/feeds/latest",

  // Xbox
  "https://news.xbox.com/en-us/feed",
  "https://www.purexbox.com/feeds/latest",

  // Nintendo
  "https://www.nintendolife.com/feeds/latest",
  "https://nintendoeverything.com/feed",
  "https://www.mynintendonews.com/feed",

  // تسريبات ومصادر يابانية/يابانية-إنجليزية
  "https://gematsu.com/feed"
];

// كلمة سر بسيطة عشان محدش يقدر يشغّل الصفحة دي غيرك أو الخدمة اللي هتحددها
const SECRET = "898";

function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  if (!match) return "";
  return match[1].replace("<![CDATA[", "").replace("]]>", "").trim();
}

function extractImage(itemXml) {
  let match = itemXml.match(/<media:content[^>]*url="([^"]+)"/);
  if (match) return match[1];
  match = itemXml.match(/<enclosure[^>]*url="([^"]+)"/);
  if (match) return match[1];
  match = itemXml.match(/<img[^>]*src="([^"]+)"/);
  if (match) return match[1];
  return "";
}

function parseRSS(xml, sourceName) {
  const items = [];
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/g) || [];
  for (const itemXml of itemMatches) {
    items.push({
      title: extractTag(itemXml, "title"),
      link: extractTag(itemXml, "link"),
      pubDate: extractTag(itemXml, "pubDate"),
      image: extractImage(itemXml),
      source: sourceName
    });
  }
  return items;
}

async function fetchOneFeed(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // ماكسيموم 8 ثواني لكل مصدر
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)" },
      signal: controller.signal
    });
    const xml = await res.text();
    const sourceName = new URL(url).hostname.replace("www.", "");
    return parseRSS(xml, sourceName);
  } catch (err) {
    console.log("خطأ في جلب " + url + ": " + err.message);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchAllFeeds() {
  // بنجيب كل المصادر في نفس الوقت (مش واحد ورا التاني) عشان يبقى أسرع
  const results = await Promise.all(RSS_SOURCES.map(fetchOneFeed));
  let allNews = results.flat();
  allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  return allNews.slice(0, 120);
}

// النهاردة الصفحة دي بقت endpoint عادي بيتزار بـ GET، مش scheduled handler
export async function onRequestGet(context) {
  try {
    const key = new URL(context.request.url).searchParams.get("key");
    if (key !== SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
    if (!context.env.NEWS_KV) {
      return new Response("خطأ: مفيش NEWS_KV متربوط بالمشروع ده", { status: 500 });
    }
    const news = await fetchAllFeeds();
    await context.env.NEWS_KV.put("latest_news", JSON.stringify(news));
    return new Response("Updated " + news.length + " news items");
  } catch (err) {
    return new Response("خطأ: " + err.message + "\n" + err.stack, { status: 500 });
  }
}
