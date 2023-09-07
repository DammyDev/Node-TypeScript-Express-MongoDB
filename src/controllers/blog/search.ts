import { RequestHandler } from 'express';
import { relogRequestHandler } from '../../middleware/request-middleware';
import { Blogs } from '../../models/Blog';

type BlogSearchQuery = {
  headings?: RegExp;
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
  dominant_topic_keywords: string;
  sentiment: string;
  published_year: string;
};

const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escapes special characters
};

const buildBlogSeachQuery = (searchTerm: string): BlogSearchQuery => {
  const query: BlogSearchQuery = {};
  if (searchTerm) {
    const sanitizedTerm = escapeRegExp(searchTerm);
    query.headings = new RegExp(`.*${sanitizedTerm}.*`, 'i');
  }

  return query;
};

// const buildBlogSeachQuery = (searchTerm: string) => {
//   const query: any = {};
//   if (searchTerm) {
//     query.heading_texts = new RegExp(`.*${searchTerm}.*`, 'i');
//   }
//   // if (searchTerm) {
//   //   query.body = new RegExp(`.*${searchTerm}.*`, 'i');
//   // }

//   return query;
// };

// const searchWrapper: RequestHandler = async (req, res) => {
//   const { q = undefined } = req.query;
//   const { page = undefined } = req.query;
//   const docsPerPage = 10;
//   const currentPage = Number(page) || 1;

//   const query = buildBlogSeachQuery((q as string));
//   const totalResult = await Blogs.find(query).countDocuments();
//   const blogs = await Blogs.find(query).skip(docsPerPage * currentPage).limit(docsPerPage);
//   res.send({ blogs, currentPage, pages: Math.ceil(totalResult / docsPerPage) });
// };

const getLabelsAndData = (arr: DataObject[]): ChartResult => {
  const countMap: { [key: string]: number } = {};

  // Iterate over the array and count occurrences of each published_year
  arr.forEach(item => {
      // If published_year is an empty string, set it to "2023"
      // const year = item.published_year === "" ? "2023" : item.published_year;

      if (countMap[item.published_year]) {
          countMap[item.published_year]++;
      } else {
          countMap[item.published_year] = 1;
      }
  });

  // Extract labels and data from the countMap
  const labels = Object.keys(countMap);
  const data = Object.values(countMap);

  return {
      labels,
      data
  };
}


// const searchWrapper: RequestHandler = async (req, res) => {
//   try {
//     const { q = '', page = '1' } = req.query;
//     const docsPerPage = 10;
//     const currentPage = Math.max(1, Number(page)); // Ensure currentPage is at least 1

//     const query = buildBlogSeachQuery(q as string);
//     const totalResult = await Blogs.countDocuments(query); // Use countDocuments directly on the model
//     const totalPages = Math.ceil(totalResult / docsPerPage);

//     // Ensure we're not trying to fetch a page that doesn't exist
//     if (currentPage > totalPages && totalResult > 0) {
//       return res.status(400).send({ error: 'Page does not exist' });
//     }

//     const skipAmount = docsPerPage * (currentPage - 1); // Adjusted skip calculation
//     const blogs = await Blogs.find(query).skip(skipAmount).limit(docsPerPage);
//     const chartData = getLabelsAndData(blogs);
    
//     res.send({ blogs, currentPage, pages: totalPages, totalResult, chartData });
//   } catch (error) {
//     res.status(500).send({ error: 'Server error' });
//   }
// };

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

  // Add the new label and data value to the beginning of the arrays
  inputData.labels.unshift("<2014");
  inputData.data.unshift(sum);

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

    // Ensure we're not trying to fetch a page that doesn't exist
    if (currentPage > totalPages && totalResult > 0) {
      return res.status(400).send({ error: 'Page does not exist' });
    }

    const skipAmount = docsPerPage * (currentPage - 1); // Adjusted skip calculation
    const blogs = await Blogs.find(query).skip(skipAmount).limit(docsPerPage);

    // Fetch chartData using aggregation
    const aggregationResult = await Blogs.aggregate([
      { $match: query },
      {
        $group: {
            _id: "$published_year",
            count: { $sum: 1 }
        }
      },
      {
        $project: {
            published_year: "$_id",
            count: 1,
            _id: 0
        }
      },
      {
        $sort: { published_year: 1 }
      }
    ]);

    const chartData = {
      labels: aggregationResult.map(item => item.published_year),
      data: aggregationResult.map(item => item.count)
    };

    const processedChartData = processChartData(chartData);

    res.send({ blogs, currentPage, pages: totalPages, totalResult, processedChartData });
  } catch (error) {
    res.status(500).send({ error: 'Server error' });
  }
};


export const search = relogRequestHandler(searchWrapper);