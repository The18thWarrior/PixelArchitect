// Make sure to add OPENAI_API_KEY as a secret

import {
  OpenAI,
} from "openai";
import type { NextApiRequest, NextApiResponse } from "next";
import { MessageContentText, ThreadMessage } from "openai/resources/beta/threads/messages/messages";
import rateLimit, { checkLimit } from "@/utils/rateLimit";
import { categorizeMessage, constructDataQuery, defaultMessage, getThreadDetails, isRunComplete, sendArchitectMessage, sendDataAnalystMessage } from "@/utils/openai";

const limiter = rateLimit({
  interval: 60 * 60 * 1000, // 60 minutes s
  uniqueTokenPerInterval: 500, // Max 500 users per second
})


const configuration = {
  apiKey: process.env.OPENAI_API_KEY,
};

const openai = new OpenAI(configuration);

async function chatHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    await isRunComplete(req, res);
  } else if (req.method === 'POST') {
    const openaiKey = req.headers.authorization;
    if (openaiKey && openaiKey.length > 0) {
      await handlePost(req, res);
    } else {
      const isValid = await checkLimit(req, res, limiter);
      if (isValid) {
        await handlePost(req, res);
      }
    }
  } else if (req.method === 'PATCH') {
    await getThreadDetails(req, res);
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const path = req.query;
  if (!path.slug) {
    await defaultMessage(req, res);
  } else if (path.slug[0] === 'categorize') {
    await categorizeMessage(req, res);
  } else if (path.slug[0] === 'data') {
    await constructDataQuery(req, res);
  } else if (path.slug[0] === 'analyst') {
    await sendDataAnalystMessage(req, res);
  } else if (path.slug[0] === 'architect') {
    await sendArchitectMessage(req, res);
  }
  
}

export default chatHandler;
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
  // Specifies the maximum allowed duration for this function to execute (in seconds)
  maxDuration: 30,
}