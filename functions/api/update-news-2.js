// المجموعة التانية من المصادر - منفصلة عن الأولى عشان محدش يتخطى حد الـ 50 طلب المسموح بيه مجاناً
const RSS_SOURCES = [
  "https://retronauts.com/feed",
  "https://www.indieretronews.com/feeds/posts/default?alt=rss",
  "https://www.indiegamesplus.com/feed",
  "https://www.theguardian.com/games/rss",
  "https://www.shacknews.com/rss",
  "https://www.techraptor.net/feed",
  "https://www.videochums.com/feed",
  "https://gamecritics.com/feed",
  "https://gamingbolt.com/feed",
  "https://www.gamedeveloper.com/rss.xml",
  "https://www.droidgamers.com/feed",
  "https://massivelyop.com/feed",
  "https://www.tabletopgamingnews.com/feed",
  "https://www.gamingonphone.com/feed",
  "https://www.bagogames.com/feed",
  "https://www.dualshockers.com/feed",
  "https://www.gamingtrend.com/feed",
  "https://venturebeat.com/category/games/feed/",
  "https://www.gamewatcher.com/feed",
  "https://www.rpgsite.net/feed",
  "https://www.rpgamer.com/feed",
  "https://www.hardcoregamer.com/feed",
  "https://gamerevolution.com/feed",
  "https://wegotthiscovered.com/feed/",
  "https://www.gamerbraves.com/feed",
  "https://www.vooks.net/feed",
  "https://www.gonintendo.com/feed",
  "https://checkpointgaming.net/feed",
  "https://www.thexboxhub.com/feed",
  "https://www.psu.com/feed",
  "https://www.gamingbible.com/feed",
  "https://esports.gg/feed",
  "https://www.invenglobal.com/rss/en/news",
  "https://www.gameriv.com/feed",
  "https://g2g.news/feed",
  "https://www.ausgamers.com/rss.xml"
];

// نفس كلمة السر بتاعة الملف الأول
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
  const timeout = setTimeout(() => controller.abort(), 8000);
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
  const results = await Promise.all(RSS_SOURCES.map(fetchOneFeed));
  let allNews = results.flat();
  allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  return allNews.slice(0, 120);
}

// نفس فكرة الملف الأول، بس بيحفظ تحت اسم "latest_news_2" عشان ميدوسش على الأول
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
    await context.env.NEWS_KV.put("latest_news_2", JSON.stringify(news));
    return new Response("Updated " + news.length + " news items (batch 2)");
  } catch (err) {
    return new Response("خطأ: " + err.message + "\n" + err.stack, { status: 500 });
  }
}
