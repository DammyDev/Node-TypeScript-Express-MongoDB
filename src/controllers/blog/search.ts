import { RequestHandler } from 'express';
import { relogRequestHandler } from '../../middleware/request-middleware';
import { Blogs } from '../../models/Blog';

const { MongoError } = require('mongodb');


type BlogSearchQuery = {
  top_10_terms?: RegExp;
};

type ChartResult = {
  labels: string[];
  data: number[];
};

type DataObject = {
  _id: string;
  url: string;
  headings: string;
  content: string;
  dominant_topic: number;
  dominant_topic_keywords: string;
  sentiment: string;
  published_year: string;
  top_10_terms: string
};

const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escapes special characters
};

const buildBlogSeachQuery = (searchTerm: string): BlogSearchQuery => {
  const query: BlogSearchQuery = {};
  if (searchTerm) {
    const sanitizedTerm = escapeRegExp(searchTerm);
    // query.top_10_terms = new RegExp(`.*${sanitizedTerm}.*`, 'i');
    query.top_10_terms = new RegExp(`\\b${sanitizedTerm}\\b`, 'i');

  }
   
  return query;
};

function processChartData(inputData: ChartResult): ChartResult {
  let sum = 0;
  let indicesToRemove: number[] = [];

  // Iterate through the labels
  for (let i = 0; i < inputData.labels.length; i++) {
      // Check if the label is empty or a number less than or equal to 2014
      if (inputData.labels[i] === "" || (!isNaN(Number(inputData.labels[i])) && Number(inputData.labels[i]) < 2014)) {
          sum += inputData.data[i]; // Add the corresponding data value to the sum
          indicesToRemove.push(i); // Store the index to remove later
      }
  }

  // Remove the summed entries in reverse order to avoid index shifting
  for (let i = indicesToRemove.length - 1; i >= 0; i--) {
      inputData.labels.splice(indicesToRemove[i], 1);
      inputData.data.splice(indicesToRemove[i], 1);
  }

  return inputData;
}


const searchWrapper: RequestHandler = async (req, res) => {
  try {
    const { q = '', page = '1' } = req.query;

    const docsPerPage = 10;
    const currentPage = Math.max(1, Number(page)); // Ensure currentPage is at least 1

    const query = buildBlogSeachQuery(q as string);
    const totalResult = await Blogs.countDocuments(query); // Use countDocuments directly on the model
    const totalPages = Math.ceil(totalResult / docsPerPage);

    // Get the total count of documents in the collection
    const totalCount = await Blogs.countDocuments({});

    // Ensure we're not trying to fetch a page that doesn't exist
    if (currentPage > totalPages && totalResult > 0) {
      return res.status(400).send({ error: 'Page does not exist' });
    }

    const skipAmount = docsPerPage * (currentPage - 1); // Adjusted skip calculation
    // const blogs = await Blogs.find(query).skip(skipAmount).limit(docsPerPage);

    const blogs = await Blogs.aggregate([
      { $match: query },
      {
        $project: {
          url: 1,
          published_year: 1,
          headings: 1,
          sentiment: 1,
          dominant_topic: 1,
          top_10_terms: 1,
          tf_score: `$top_10_tf_scores.${q}`,
          idf_score: {
            $divide: [
              { $log: [{ $divide: [totalCount, totalResult] }, Math.E] },
              { $log: [10, Math.E] }
            ]
          },
          tf_idf_score: {
            $multiply: [
              `$top_10_tf_scores.${q}`,
              {
                $divide: [
                  { $log: [ { $divide: [totalCount, totalResult] }, Math.E ] },
                  { $log: [10, Math.E] }
                ]
              }
            ]
          }
        }
      },
      // { $sort: { tf_idf_score: -1 } },  // Sort by tf_idf_score in descending order
      { $sort: { published_year: -1 } },  // Sort by tf_idf_score in descending order
      { $skip: skipAmount },
      { $limit: docsPerPage }
    ]);
    
  
    // Fetch chartData using aggregation
    // const aggregationResult = await Blogs.aggregate([
    //   { $match: query },
    //   {
    //     $group: {
    //         _id: "$published_year",
    //         count: { $sum: 1 }
    //     }
    //   },
    //   {
    //     $project: {
    //         published_year: "$_id",
    //         count: 1,
    //         _id: 0
    //     }
    //   },
    //   {
    //     $sort: { published_year: 1 }
    //   }
    // ]);

    const aggregationResult = await Blogs.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$published_year",
          count: { $sum: 1 },
          avg_tf_score: { $max: `$top_10_tf_scores.${q}` } // Calculate the average tf_score
        }
      },
      {
        $project: {
          year: "$_id",
          count: 1,
          avg_tf_score: 1,
          _id: 0
        }
      },
      {
        $sort: { year: 1 }
      }
    ]);
    

    const chartData = {
      labels: aggregationResult.map(item => item.year),
      data: aggregationResult.map(item => item.avg_tf_score)
    };

    const processedChartData = processChartData(chartData);

    res.send({ blogs, currentPage, pages: totalPages, totalResult, chartData, processedChartData });
  } catch (error) {
    console.log(error);
    if (error instanceof MongoError && error.message.includes("can't $divide by zero")) {
      return res.status(400).send({ error: 'Bad request: search term cannot be found' });
    }
    res.status(500).send({ error: 'Server error' });
  }
};

export const search = relogRequestHandler(searchWrapper)