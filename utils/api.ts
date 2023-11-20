import axios from "axios";

export async function postMessageDefault (
  sub: string,
  userInput: string, 
  openAIKey = ''
) {
  const sendMessage = await axios({
    url: `/api/chat?sub=${sub}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": openAIKey || ''
    },
    data: JSON.stringify({ message: userInput }),
    timeout: 60000      
  });

  return sendMessage.data;
}

export async function postMessageCategory (
  userInput: string, 
  sObjects: any,
  openAIKey = ''
) {
  const sendMessage = await axios({
    url: `/api/chat/categorize`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": openAIKey || ''
    },
    data: JSON.stringify({ message: userInput, sObjects: sObjects }),
    timeout: 60000      
  });

  return sendMessage.data;
}

export async function postMessageSoql (
  sub: string,
  userInput: string, 
  sObjects: string[],
  fields: any[],
  openAIKey = ''
) {
  const sendMessage = await axios({
    url: `/api/chat/data?sub=${sub}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": openAIKey || ''
    },
    data: JSON.stringify({ message: userInput, sObjects: sObjects, fields: fields }),
    timeout: 60000      
  });

  if (typeof sendMessage.data === 'string') {
    return JSON.parse(sendMessage.data);
  }
  return sendMessage.data;
}

export async function postMessageQuery (
  sub: string,
  query: string, 
  openAIKey = ''
) {
  const sendMessage = await axios({
    url: `/api/adapter/salesforce/data?sub=${sub}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": openAIKey || ''
    },
    data: JSON.stringify({ query: query }),
    timeout: 60000      
  });

  return sendMessage.data;
}

export async function postMessageAnalyst (
  userInput: string, 
  threadId: string,
  query: string,
  response: any[],
  openAIKey = ''
) {
  const sendMessage = await axios({
    url: `/api/chat/analyst`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": openAIKey || ''
    },
    data: JSON.stringify({ message: userInput, threadId, query, response }),
    timeout: 60000      
  });

  return sendMessage.data;
}

export async function postMessageArchitect (
  userInput: string, 
  threadId: string,
  fileId: string,
  openAIKey = ''
) {
  const sendMessage = await axios({
    url: `/api/chat/architect`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": openAIKey || ''
    },
    data: JSON.stringify({ message: userInput, threadId, fileId }),
    timeout: 60000      
  });

  return sendMessage.data;
}

export async function uploadFile (fullDataset: any, openAIKey = ''){
  const result = await axios({
    url: `/api/adapter/salesforce/metadata`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": openAIKey || ''
    },
    data: JSON.stringify({ file: fullDataset }),
    timeout: 60000      
  });
  return result.data;
}