const MEDIASTACK_API_KEY = "734b040d82fc2d663cb5dcaa24a8a15b";
const NEWSAPI_KEY = "4a357d0998614317a1cbaa9c4092631c";
const GNEWS_API_KEY = "b084f6e1dca64ad6c8a080d3ca73c23e";
const CURRENTS_API_KEY = "9Gq8-8_V3dR1T4etQ9ylLZGFNW_DmRLW9bZ0YVz5oUTD9efX";

const MAX_ARTICLES = 1000; // Maximum articles to fetch
const PAGE_SIZE = 100; // Page size for paginated APIs
const TOTAL_DAYS = 7; // Fetch news from the last 7 days
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // Milliseconds in a day

async function fetchTechnologyNews() {
  const now = new Date();
  const pastDate = new Date(now - TOTAL_DAYS * ONE_DAY_MS);
  const fromDate = pastDate.toISOString().split("T")[0];
  const toDate = now.toISOString().split("T")[0];

  const newsSources = [
    {
      name: "NewsAPI",
      url: `https://newsapi.org/v2/everything?q=technology&apiKey=${NEWSAPI_KEY}&pageSize=${PAGE_SIZE}&from=${fromDate}&to=${toDate}`,
    },
    {
      name: "GNews",
      url: `https://gnews.io/api/v4/search?q=technology&token=${GNEWS_API_KEY}&max=${PAGE_SIZE}&from=${fromDate}&to=${toDate}`,
    },
    {
      name: "Currents",
      url: `https://api.currentsapi.services/v1/latest-news?category=technology&start_date=${fromDate}&end_date=${toDate}&apiKey=${CURRENTS_API_KEY}`,
    },
    {
      name: "MediaStack",
      url: `https://api.mediastack.com/v1/news?access_key=${MEDIASTACK_API_KEY}&categories=technology&date=${fromDate},${toDate}&limit=${PAGE_SIZE}`,
    },
  ];

  const allArticles = [];

  // Fetch news from all APIs
  for (const source of newsSources) {
    try {
      console.log(`Fetching from ${source.name}`);
      const response = await fetch(source.url);

      if (!response.ok) {
        throw new Error(`Error fetching from ${source.name}: ${response.status}`);
      }

      const data = await response.json();
      const articles = data.articles || data.data || data.results || [];
      console.log(`Fetched ${articles.length} articles from ${source.name}`);

      const formattedArticles = articles.map((article) => {
        let imageUrl = article.image || article.urlToImage;

        // Only assign image URL if it's valid and not a placeholder
        if (!imageUrl || imageUrl === "https://via.placeholder.com/400x200") {
          imageUrl = null; // Skip the article if no valid image is available
        }

        return {
          title: article.title || "No title",
          description: article.description || "No description available",
          published: article.published_at || article.publishedAt || article.published || article.pubDate,
          link: article.url || article.link,
          image: imageUrl,
          source: source.name,
        };
      });

      // Filter out articles with no image
      const articlesWithImage = formattedArticles.filter(article => article.image);

      allArticles.push(...articlesWithImage);
    } catch (error) {
      console.error(`Error fetching from ${source.name}: ${error.message}`);
    }
  }

  // Fetch TechCrunch RSS feed
  const techCrunchArticles = await fetchRSSFeed("https://techcrunch.com/feed/");
  allArticles.push(...techCrunchArticles);

  // Fetch Wired RSS feed
  const wiredArticles = await fetchRSSFeed("https://www.wired.com/feed/rss");
  allArticles.push(...wiredArticles);

  console.log("Total Articles Fetched:", allArticles.length);

  // Filter, sort, and bind the articles
  const filteredArticles = filterArticlesByDate(allArticles);
  bindData(filteredArticles);
}

// Generic function to fetch RSS feeds and images
async function fetchRSSFeed(rssUrl) {
  try {
    const response = await fetch(rssUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${rssUrl}`);
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");

    const items = xmlDoc.querySelectorAll("item");
    const articles = Array.from(items).map((item) => {
      // Try to fetch image from <media:content>, <enclosure> or other tags
      const imageTag = item.querySelector("media\\:content, enclosure, media\\:thumbnail");
      let imageUrl = imageTag?.getAttribute("url") || null;

      // If no image found in media or enclosure, check the description for image
      if (!imageUrl) {
        const description = item.querySelector("description")?.textContent || "";
        const imgMatch = description.match(/<img[^>]+src="([^"]+)"/);
        imageUrl = imgMatch ? imgMatch[1] : null; // Don't assign placeholder here
      }

      return {
        title: item.querySelector("title")?.textContent || "No title",
        description: item.querySelector("description")?.textContent || "No description available",
        published: item.querySelector("pubDate")?.textContent,
        link: item.querySelector("link")?.textContent,
        image: imageUrl, // Now can be null
        source: rssUrl.includes("techcrunch") ? "TechCrunch" : "Wired",
      };
    });

    console.log(`Fetched ${articles.length} articles from ${rssUrl}`);
    return articles;
  } catch (error) {
    console.error(`Error fetching RSS feed ${rssUrl}:`, error.message);
    return [];
  }
}

// Filter and sort articles by date
function filterArticlesByDate(articles) {
  const now = Date.now();
  const filteredArticles = articles.filter((article) => {
    const publishedDate = new Date(
      article.published_at || article.publishedAt || article.published || article.pubDate
    );
    return now - publishedDate.getTime() <= TOTAL_DAYS * ONE_DAY_MS;
  });

  // Sort articles by published date (newest first)
  return filteredArticles.sort((a, b) => {
    const dateA = new Date(a.published_at || a.publishedAt || a.published || a.pubDate);
    const dateB = new Date(b.published_at || b.publishedAt || b.published || b.pubDate);
    return dateB - dateA;
  });
}

// Bind and display articles
async function bindData(articles) {
  const cardsContainer = document.getElementById("cards-container");
  cardsContainer.innerHTML = "";

  if (articles.length === 0) {
    console.error("No articles found after filtering.");
    cardsContainer.innerHTML = "<p>No relevant tech news available.</p>";
    return;
  }

  for (let article of articles) {
    if (!article.title || !article.image) {
      continue; // Skip articles without a title or image
    }

    const cardTemplate = document
      .getElementById("template-news-card")
      .content.cloneNode(true);
    cardTemplate.querySelector("#news-img").src =
      article.image || "https://via.placeholder.com/400x200"; // Fallback image if no image is available
    cardTemplate.querySelector("#news-title").innerText = article.title || "No title";
    cardTemplate.querySelector("#news-source").innerText = `${
      article.source?.name || article.source || "Unknown Source"
    } • ${new Date(article.published_at || article.publishedAt || article.published).toLocaleDateString()}`;
    cardTemplate.querySelector("#news-desc").innerText =
      article.description || "No description available.";
    cardTemplate.querySelector("#news-link").href =
      article.url || article.link;

    cardsContainer.appendChild(cardTemplate);
  }
}

// Translation function
async function translateText(text, targetLang = "en") {
  try {
    const response = await fetch("https://libretranslate.com/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: text,
        source: "auto",
        target: targetLang,
        format: "text",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to translate text");
    }

    const data = await response.json();
    return data.translatedText;
  } catch (error) {
    console.error("Error translating text:", error.message);
    return text;
  }
}




// Fetch news on page load
fetchTechnologyNews();



