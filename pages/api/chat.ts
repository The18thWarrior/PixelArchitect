// Make sure to add OPENAI_API_KEY as a secret

import {
  OpenAI,
} from "openai";
import type { NextApiRequest, NextApiResponse } from "next";
import { MessageContentText, ThreadMessage } from "openai/resources/beta/threads/messages/messages";
import rateLimit, { checkLimit } from "@/utils/rateLimit";

const limiter = rateLimit({
  interval: 60 * 60 * 1000, // 60 minutes 
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
    const isValid = await checkLimit(req, res, limiter);
    if (isValid) {
      await sendMessage(req, res);
    }
  } else if (req.method === 'PATCH') {
    await getThreadDetails(req, res);
  }
}


async function sendMessage(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const threadId = req.body.threadId.length > 0 ? req.body.threadId : (await openai.beta.threads.create()).id;
  await openai.beta.threads.messages.create(
    threadId,
    { role: "user", content: req.body.message}
  );
  const run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: process.env.OPENAI_ASSISTANT_ID as string
  })
  res.status(200).json({ runId: run.id, threadId: threadId });
}

async function isRunComplete(req: NextApiRequest, res: NextApiResponse) {
  const {
    query: { runId, threadId },
  } = req;
  const run = await openai.beta.threads.runs.retrieve(threadId as string, runId as string);
  if (run.status === 'queued' || run.status === 'in_progress' || run.status === 'cancelling') {
    //console.log('run in progress', run.id, run.status, run.last_error);
    res.status(200).json({ status: 'in_progress'});
  } else if (run.status === 'failed' || run.status === 'expired' || run.status === 'cancelled') {
    res.status(200).json({ status: 'failed', error: 'Run Failed or Cancelled'});
  } else {
    const messages = await openai.beta.threads.messages.list(threadId as string);
    //console.log('run complete', messages.data[0].content);
    const data = messages.data[0].content[0] as MessageContentText;
    res.status(200).json({ status: 'complete', result: data.text });
  }
}

async function getThreadDetails(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!req.query.threadId || req.query.threadId.length === 0) {
    res.status(400).json({error: 'No threadId included'})
    return;
  }
  const threadMessages = await openai.beta.threads.messages.list(req.query.threadId as string);
  res.status(200).json({ messages: threadMessages});
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