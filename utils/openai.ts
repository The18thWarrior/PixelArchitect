import {
  OpenAI,
} from "openai";
import type { NextApiRequest, NextApiResponse } from "next";
import { MessageContentText, ThreadMessage } from "openai/resources/beta/threads/messages/messages";
import stream from "stream";
import { nanoid } from "./utils";
import path from "path";
import { createReadStream, writeFileSync } from "fs";

const configuration = {
  apiKey: process.env.OPENAI_API_KEY,
};

const openai_main = new OpenAI(configuration);

export async function defaultMessage(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const openaiKey = req.headers.authorization;
  const openai = (openaiKey && openaiKey.length > 0) ? new OpenAI({apiKey:openaiKey}) : openai_main;

  const threadId = req.body.threadId.length > 0 ? req.body.threadId : (await openai.beta.threads.create()).id;
  await openai.beta.threads.messages.create(
    threadId,
    { role: "user", content: req.body.message}
  );
  const run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: process.env.OPENAI_ARCHITECT_ASSISTANT_ID as string
  })
  res.status(200).json({ runId: run.id, threadId: threadId });
}

export async function sendArchitectMessage(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const openaiKey = req.headers.authorization;
  const openai = (openaiKey && openaiKey.length > 0) ? new OpenAI({apiKey:openaiKey}) : openai_main;

  const threadId = req.body.threadId.length > 0 ? req.body.threadId : (await openai.beta.threads.create()).id;
  const fileId = req.body.fileId;
  await openai.beta.threads.messages.create(
    threadId,
    { 
      role: "user", 
      content: req.body.message,
      file_ids: [fileId]
    },
    
  );
  if (fileId) {
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: process.env.OPENAI_ARCHITECT_ASSISTANT_ID as string,
      tools: [{type: 'retrieval'}]
    })
    res.status(200).json({ runId: run.id, threadId: threadId });
  } else {
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: process.env.OPENAI_ARCHITECT_ASSISTANT_ID as string
    })
    res.status(200).json({ runId: run.id, threadId: threadId });
  }
  
}

export async function sendDataAnalystMessage(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const openaiKey = req.headers.authorization;
  const openai = (openaiKey && openaiKey.length > 0) ? new OpenAI({apiKey:openaiKey}) : openai_main;

  const threadId = req.body.threadId.length > 0 ? req.body.threadId : (await openai.beta.threads.create()).id;
  await openai.beta.threads.messages.create(
    threadId,
    { role: "user", content: `
    Based on the user question, SOQL query, and SOQL response, write a thoughtful natural language response to the user's question. Please be concise. 
  
    The user's question is between the triple dashes --- ${req.body.message} ---
    The SOQL query is between the triple question marks ??? ${req.body.query} ???
    The SOQL response is between the triple exclaimation marks !!! ${JSON.stringify(req.body.response)} !!!
    `}
  );
  const run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: process.env.OPENAI_ANALYST_ASSISTANT_ID as string
  })
  res.status(200).json({ runId: run.id, threadId: threadId });
}

export async function isRunComplete(req: NextApiRequest, res: NextApiResponse) {
  const {
    query: { runId, threadId },
  } = req;

  const openaiKey = req.headers.authorization;
  const openai = (openaiKey && openaiKey.length > 0) ? new OpenAI({apiKey:openaiKey}) : openai_main;

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

export async function getThreadDetails(
  req: NextApiRequest,
  res: NextApiResponse
) {

  const openaiKey = req.headers.authorization;
  const openai = (openaiKey && openaiKey.length > 0) ? new OpenAI({apiKey:openaiKey}) : openai_main;
  if (!req.query.threadId || req.query.threadId.length === 0) {
    res.status(400).json({error: 'No threadId included'})
    return;
  }
  const threadMessages = await openai.beta.threads.messages.list(req.query.threadId as string);
  res.status(200).json({ messages: threadMessages});
}

export async function categorizeMessage(
  req: NextApiRequest,
  res: NextApiResponse
) {

  const openaiKey = req.headers.authorization;
  const openai = (openaiKey && openaiKey.length > 0) ? new OpenAI({apiKey:openaiKey}) : openai_main;
  const content = req.body.message;
  const sObjects = req.body.sObjects;
  const example = {"category": 'data', "sObjects": ['']};
  const prompt = `You will be asked a question at the end of this prompt, please categorize the question into one of 3 categories. The 3 categories are 'data', 'design', 'other'. The 'data' category should represent requests that would best be represented as a table, (e.g.top 5 accounts list). If the 'data' category is selected, include which sObjects should be selected as part of retrieving that data. The available sObjects are listed between the tripple ampersands &&& ${JSON.stringify(sObjects)} &&&. The 'design' category should represent requests that involve designing, architecting, or ideating an approach to building a technical solution to the user need. The 'other' category should be a catchall for requests that don't fit into one of the first two categories. Return json in the format of the example between the triple dashes --- ${example} ---. The question is between the triple exclaimation points !!!  ${content} !!!`;
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo-1106',
    messages: [{role: 'user', content: prompt}],
    temperature: 0.7,
    response_format: {
      type: 'json_object'
    }
  })
  res.status(200).json(response.choices[0].message.content);
}

export async function constructDataQuery(
  req: NextApiRequest,
  res: NextApiResponse
) {

  const openaiKey = req.headers.authorization;
  const openai = (openaiKey && openaiKey.length > 0) ? new OpenAI({apiKey:openaiKey}) : openai_main;
  const content = req.body.message;
  const sObjects = req.body.sObjects;
  const fields = req.body.fields;
  const example = {query: 'SELECT ID FROM Account'};
  const prompt = `Based on the Salesforce object and field schemas below, write a SOQL query that would answer the user's question. ONLY use fields in the provided field schema to create the query. DO NOT use any functions within the query, the only exception being the COUNT method. 
  
  The available object are listed between the triple dashes --- ${sObjects} --- 
  The field schema for the objects are between the triple question marks ??? ${fields} ???
  
  The user's question is between the triple exclaimation points !!! ${content} !!!
  The response should follow the JSON format in the example between the triple dollar signs $$$ ${example} $$$
  `;
  const response = await openai.chat.completions.create({
    model: 'gpt-4-1106-preview',
    messages: [{role: 'user', content: prompt}],
    temperature: 0.4,
    response_format: {
      type: 'json_object'
    }
  })
  res.status(200).json(response.choices[0].message.content);
}

export async function uploadMetadata (
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const openaiKey = req.headers.authorization;
    const openai = (openaiKey && openaiKey.length > 0) ? new OpenAI({apiKey:openaiKey}) : openai_main;

    const fileData = req.body.file;
    const filePath = path.join(__dirname, `${nanoid()}.json`);

    writeFileSync(filePath, JSON.stringify(fileData, null, 2));
    const file = await openai.files.create({
      file: createReadStream(filePath),
      purpose: "assistants",
    });
    res.status(200).json({fileId: file});
  } catch (err) {
    res.status(400).json({error: 'error uploading'})
  }
  
}
export async function deleteMetadata (
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const openaiKey = req.headers.authorization;
    const openai = (openaiKey && openaiKey.length > 0) ? new OpenAI({apiKey:openaiKey}) : openai_main;
    const fileId = req.query.fileId;
    await openai.files.del(fileId as string);
    res.status(200).json({status: 'complete'});
  } catch (err) {
    res.status(400).json({error: 'error deleting'})
  }
}