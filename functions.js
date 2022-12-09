import PromptSync from "prompt-sync";
let prompt = PromptSync({ sigint: true });

async function sleep(timeout) {
  await new Promise((resolv) => setTimeout(resolv, timeout));
}
//
// ===============================
//
async function getCurrentPage(browser) {
  async function findAsync(arr, asyncCallback) {
    let promises = arr.map(asyncCallback);
    let results = await Promise.all(promises);
    let index = results.findIndex((result) => result);
    return arr[index];
  }
  let pages = await browser.pages();
  let visiblePage = await findAsync(pages, async (p) => {
    let state = await p.evaluate(async () => document.visibilityState);
    return state === "visible";
  });
  return visiblePage;
}
//
// ===============================
//
async function turnOffImages(page) {
  await page.setRequestInterception(true);
  await page.on("request", (req) => {
    let resourceType = req.resourceType();
    if (
      resourceType === "stylesheet" ||
      resourceType === "image" ||
      resourceType === "font"
    ) {
      req.abort();
    } else {
      req.continue();
    }
  });
}
//
// ===============================
//
function getQuery() {
  while (true) {
    var query = prompt("what to search for? : ");
    if (typeof query == "string" && query.length > 0) {
      break;
    }
  }
  return query;
}
//
// ===============================
//
async function searchByQuery(page, query) {
  try {
    await page.goto(`https://w.egybest.dev/explore/?q=${query}`);

    let result = await page.evaluate(() => {
      // browser =================
      let resultRaw = Array.from(document.getElementById("movies").children);
      let resultFinal = resultRaw
        .map((element) => {
          // extract title
          let titleElement = element.querySelector(".title");
          let title = titleElement === null ? "" : titleElement.textContent;
          // extract rating
          let ratingElement = element.querySelector(".rating i");
          let rating = ratingElement === null ? "0" : ratingElement.textContent;
          // extract quality
          let qualityElement = element.querySelector(".ribbon.r3 span");
          let quality =
            qualityElement === null ? "" : qualityElement.textContent;
          // extract link
          let url = element.href;
          // extract type
          let type = url.slice(
            url.indexOf("w.egybest.dev") + "w.egybest.dev".length + 1
          );
          type = type.slice(0, type.indexOf("/"));
          return { title, type, rating, url, quality };
        })
        .filter((item) => {
          return item.title !== "";
        })
        .sort((a, b) => {
          a = +a.rating;
          b = +b.rating;
          if (a < b) {
            return 1;
          }
          if (a > b) {
            return -1;
          }
          return 0;
        });
      return resultFinal;
      // browser =================
    });
    return result;
  } catch (error) {
    console.log(
      `error while visiting => https://w.egybest.dev/explore/?q=${query}`
    );
    console.log(error);
  }
}
//
// ===============================
//
async function mediaSelect(searchResult) {
  try {
    while (true) {
      console.log("\n");
      searchResult.forEach((item, index) => {
        console.log(item.title);
        console.log(item.type);
        console.log(item.rating);
        console.log(`ID => ${index + 1}`);
        console.log("-----------------------");
      });
      console.log("\n");
      var selection = Number(prompt("Select one by ID : "));
      console.log("\n");
      if (
        typeof selection == "number" &&
        1 <= selection &&
        selection <= searchResult.length
      ) {
        break;
      }
    }
    return searchResult[selection - 1];
  } catch (error) {
    console.log(`error while selecting from :\n${searchResult}`);
    console.log(error);
  }
}
//
// ===============================
//
async function getMovieData(page, selectedMedia) {
  try {
    await page.goto(selectedMedia.url);
    // browser =================
    let resolutions = await page.evaluate(() => {
      // get Movie Duration =================
      let durationElement = document.querySelector(
        ".movieTable > tbody > tr:nth-child(5) > td:nth-child(2) "
      );
      let duration =
        durationElement === null ? "" : durationElement.textContent;
      // get Movie Resolutions =================
      let resolutions = Array.from(
        document.querySelectorAll("#mainLoad #watch_dl table tbody tr")
      ).map((item) => {
        // get Movie Resolution =================
        let resolutionElement = item.children[1];
        let resolution =
          resolutionElement === null ? "" : resolutionElement.textContent;
        // get Movie Size =================
        let sizeElement = item.children[2];
        let size = sizeElement === null ? "" : sizeElement.textContent;
        return { resolution, size };
      });
      return { duration, resolutions };
    });
    // browser =================
    return { ...selectedMedia, ...resolutions };
  } catch (error) {
    console.log(`error while getting media data from :\n${selectedMedia}`);
    console.log(error);
  }
}
//
// ===============================
//
async function movieResolutionSelect(mediaData) {
  let { resolutions } = mediaData;
  while (true) {
    console.log("\n");
    resolutions.forEach((item, index) => {
      console.log(item.resolution);
      console.log(item.size);
      console.log(`ID => ${index + 1}`);
      console.log("-----------------------");
    });
    console.log("\n");
    var selection = Number(prompt("Select one by ID : "));
    console.log("\n");
    if (
      typeof selection == "number" &&
      1 <= selection &&
      selection <= resolutions.length
    ) {
      break;
    }
  }
  return {
    ...mediaData,
    selectedResolution: resolutions[selection - 1].resolution,
  };
}
//
// ===============================
//
async function getMovieDownloadUrl(page, movieData) {
  try {
    await page.goto(movieData.url);
    let downloadUrl = await extractDownloadUrl(
      page,
      movieData.selectedResolution,
      movieData.url
    );
    return { ...movieData, downloadUrl };
  } catch (error) {
    console.log(error);
  }
}

async function getSerieData(page, selectedMedia) {
  try {
    await page.goto(selectedMedia.url);
    let seasons = await page.evaluate(() => {
      // browser =================
      // get seasons =================
      let seasons = Array.from(
        document.querySelectorAll(
          "#mainLoad > .mbox:nth-child(2) > .h_scroll > .contents.movies_small > a"
        )
      )
        .reverse()
        .map((item, index) => {
          // get season url =================
          let url = item.href;
          return { season: index + 1, url };
        });
      return seasons;
      // browser =================
    });
    return { ...selectedMedia, seasons };
  } catch (error) {
    console.log(`error while getting media data from :\n${selectedMedia}`);
    console.log(error);
  }
}
//
// ===============================
//
async function serieResolutionSelect(mediaData) {
  let resolutions = ["Full HD 1080p ", "HD 720p ", "SD 480p "];
  while (true) {
    console.log("\n");
    resolutions.forEach((item, index) => {
      console.log(item);
      console.log(`ID => ${index + 1}`);
      console.log("-----------------------");
    });
    console.log("\n");
    var selection = Number(prompt("Select one by ID : "));
    console.log("\n");
    if (
      typeof selection == "number" &&
      1 <= selection &&
      selection <= resolutions.length
    ) {
      break;
    }
  }
  return {
    ...mediaData,
    selectedResolution: resolutions[selection - 1],
  };
}
//
// ===============================
//
async function getSerieEpisodes(page, serieObject) {
  try {
    for (const season of serieObject.seasons) {
      let seasonEpisodes = await extractEpisodes(page, season);
      season.episodes = seasonEpisodes;
    }
    return serieObject;
  } catch (error) {
    console.log(`error in getSerieDownloadUrl => ${error}`);
  }
}
//
// ===============================
//
async function extractEpisodes(page, season) {
  try {
    await page.goto(season.url);
    let episodes = await page.evaluate(() => {
      // browser =================
      // get Epidodes =================
      let episodes = Array.from(
        document.querySelectorAll(
          "#mainLoad > div:nth-child(3) > .movies_small > a"
        )
      )
        .reverse()
        .map((element, index) => {
          // get Episode url and number =================
          let url = element.href;
          let episode = index + 1;
          return { episode, url };
        });
      return episodes;
      // browser =================
    });
    return episodes;
  } catch (error) {
    console.log(`error in getSerieEpisodes => ${error}`);
  }
}
//
// ===============================
//
async function getEpisodesDownloadUrl(page, serieObject) {
  try {
    for (const season of serieObject.seasons) {
      console.log(`start process season ${season.season}.`);
      for (const episode of season.episodes) {
        console.log(`start process episode ${episode.episode}.`);
        await page.goto(episode.url)
        episode.downloadUrl = await extractDownloadUrl(
          page,
          serieObject.selectedResolution,
          episode.url
        );
        console.log(`episode ${episode.episode} Done.`);
        await sleep(1000)
      }
      console.log(`season ${season.season} Done.`);
    }
    return serieObject
  } catch (error) {
    console.log(`error in getSerieEpisodes => ${error}`);
  }
}
//
// ===============================
//
async function extractDownloadUrl(page, resolution, mediaUrl) {
  try {

    await removeAds(page, resolution, mediaUrl);

    let checkElement = await page.$(
      "#mainLoad .movie_title h1 "
    );
    if (checkElement === null) {
      console.log('wrong page, redirect .....');
      await page.goto(mediaUrl);
      return await extractDownloadUrl(page, resolution, mediaUrl);
    }

    let browser = await page.browser();
    let resolutions = await page.evaluate(() => {
      // get Movie Resolutions =================
      let resolutions = Array.from(
        document.querySelectorAll("#mainLoad #watch_dl table tbody tr")
      ).map((item) => {
        // get Movie Resolution =================
        let resolutionElement = item.children[1];
        let resolution =
          resolutionElement === null ? "" : resolutionElement.textContent;
        return resolution;
      });
      return resolutions;
    });
    let buttons = await page.$$(".nop.btn.g.dl._open_window");
    let index = resolutions.includes(resolution)
      ? resolutions.indexOf(resolution)
      : 0;
    let button = buttons[index];

    await button.click();
    await sleep(1000);

    let pages = await browser.pages();
    let pagesNumber = pages.length;

    // if there are 1 page
    if (pagesNumber == 1) {
      let pageURL = await page.url();
      if (pageURL.includes("vidstream")) {
        return pageURL;
      } else {
        return await extractDownloadUrl(page, resolution, mediaUrl);
      }
    }
    // if there are 2 pages
    else if (pagesNumber == 2) {
      page = await getCurrentPage(browser);
      let pageURL = await page.url();
      let adBlockStat = await page.evaluate(() => {
        return document.querySelector('#GlobalFrame').classList.contains('compact')
      })

      if (adBlockStat) {
        await adBlockBypass(page)
        page = await getCurrentPage(browser);
        return await extractDownloadUrl(page, resolution, mediaUrl);
      }
      else if (pageURL.includes("vidstream")) {
        await page.close();
        page = await getCurrentPage(browser);
        return pageURL;
      }
      else {
        await page.close();
        page = await getCurrentPage(browser);
        return await extractDownloadUrl(page, resolution, mediaUrl);
      }
    }
    // if there are more than 2 pages
    else {
      console.log(
        "more than two popup page when click download  -- in extractDownloadUrl function"
      );
    } // <========
  } catch (error) {
    console.log(`error in extractDownloadUrl => ${error}`);
  }
}
//
// ===============================
//
async function removeAds(page, resolution, mediaURL) {
  try {
    console.log(`removeAds`);
    let browser = await page.browser();
    let title = await page.$("#mainLoad .movie_title h1");
    await title.click();
    await sleep(1000);

    let pages = await browser.pages();

    if (pages.length == 1) {
      let newURL = await page.url();
      if (newURL != mediaURL) {
        return 'origin page lost'
      }

    } else if (pages.length == 2) {
      page = await getCurrentPage(browser);
      await page.close();
      page = await getCurrentPage(browser);
      return await removeAds(page, resolution, mediaURL);

    } else if (pages.length > 2) {
      console.log("more than two popup whene removing ads <==> WTF!!!!");
      process.exit(0);
    }
  } catch (error) {
    console.log(`error in removeAds => ${error}`);
  }
}
//
// ===============================
//
async function adBlockBypass(page) {
  try {
    console.log(`adBlockBypass`);
    let browser = await page.browser();
    let pagesBefore = await browser.pages();
    let title = await page.$("#GlobalFrame p input");
    await title.click();
    await sleep(1000);

    let pagesAfter = await browser.pages();

    if (pagesAfter == pagesBefore) {

      let adBlockStat = await page.evaluate(() => {
        return document.querySelector('#GlobalFrame').classList.contains('compact')
      })

      if (adBlockStat) {
        console.log('close button did nothing');
        return await adBlockBypass(page)
      }
      else {
        await page.close();
        page = await getCurrentPage(browser);
        return 'good'
      }

    }
    else if (pagesAfter > pagesBefore) {
      page = await getCurrentPage(browser);
      await page.close();
      page = await getCurrentPage(browser);
      let adBlockStat = await page.evaluate(() => {
        return document.querySelector('#GlobalFrame').classList.contains('compact')
      })

      if (adBlockStat) {
        return await adBlockBypass(page)
      }
      else {
        await page.close();
        page = await getCurrentPage(browser);
        return 'good'
      }
    }
  } catch (error) {
    console.log(`error in adBlockBypass => ${error}`);
  }
}

export {
  getQuery,
  getCurrentPage,
  turnOffImages,
  searchByQuery,
  mediaSelect,
  // movies
  getMovieData,
  movieResolutionSelect,
  getMovieDownloadUrl,
  // series
  getSerieData,
  serieResolutionSelect,
  getSerieEpisodes,
  getEpisodesDownloadUrl,
};
