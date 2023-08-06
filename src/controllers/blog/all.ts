import { RequestHandler } from 'express';
import { relogRequestHandler } from '../../middleware/request-middleware';
import { Blogs } from '../../models/Blog';

const allWragger: RequestHandler = async (req, res) => {
  const blog = await Blogs.find();
  res.status(200).json(blog);
};

export const all = relogRequestHandler(allWragger);
