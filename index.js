import browser from "./browserCreator.js";
import fs from 'fs'
import {
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
  getEpisodesDownloadUrl
} from "./functions.js";



(async function main() {
  let page = await getCurrentPage(browser);
  await turnOffImages(page);

  let query = getQuery();
  let searchResult = await searchByQuery(page, query);
  let selected = await mediaSelect(searchResult);
  console.log(`You have selected => ${selected.type} ${selected.title}`);

  // Movie
  if (selected.type === "movie") {

    var movieObject = await getMovieData(page, selected);
    movieObject = await movieResolutionSelect(movieObject);
    movieObject = await getMovieDownloadUrl(page, movieObject);
  }

  // Anime or Serie
  else if (selected.type === "anime" || selected.type === "series") {

    var serieObject = await getSerieData(page, selected);
    // here we should chose which seasons to download
    serieObject = await serieResolutionSelect(serieObject);
    serieObject = await getSerieEpisodes(page, serieObject);
    serieObject = await getEpisodesDownloadUrl(page, serieObject);
  }
  // Not Ordinay Type
  else {
    console.log(`selcted objet has unordinary type\n`);
    console.log(selected);
  }

  let result = movieObject || serieObject;
  let json = JSON.stringify(result);
  fs.writeFileSync(`data/${result.title}.json`, json, 'utf8');

  browser.close();

})()