
import { VercelKV } from '@vercel/kv'
import { Connection, DescribeSObjectResult, Field, ListMetadataQuery, MetadataInfo, OAuth2, Query, QueryResult } from "jsforce";
import { chunkArray, nanoid } from '@/utils/utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { deleteMetadata, uploadMetadata } from '@/utils/openai';

var kv = new VercelKV({ 
  url: process.env.KV_REST_API_URL as string,
  token: process.env.KV_REST_API_TOKEN as string
})
var oauth2 = new OAuth2({
  // you can change loginUrl to connect to sandbox or prerelease env.
  // loginUrl : 'https://test.salesforce.com',
  clientId: process.env.SALESFORCE_CLIENT_ID || '',
  clientSecret: process.env.SALESFORCE_CLIENT_SECRET || '',
  redirectUri : process.env.SALESFORCE_REDIRECT_URL || ''
});

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const path = req.query;
  if (req.method === 'GET') {
    if (!path.slug) {
      const sub = path.sub;
      if (!sub) {
        res.redirect('/error');
      } else {
        res.redirect(getAuthUrl(sub as string));
      }
      
    } else if (path.slug[0] === 'callback') {
      const code = path.code;
      const sub = path.state;
      if (!code || !sub) {
        res.redirect('/error');
        return;
      }
      const userInfo = await oauthCallback(code as string, sub as string)
      res.redirect('/');
      //req.
    } else if (path.slug[0] === 'user') {
      const sub = path.sub;
      const userInfo = await getUserInfo(sub as string);
      res.status(200).json(userInfo);
    } else if (path.slug[0] === 'metadata') {
      const sub = path.sub;
      const conn = await createConnection(sub as string);
      if (!conn) {
        res.status(400).json({err: 'no connection created'});
        return;
      }
      const type = path.type;
      if (type === 'metadata') {
        const result = await getAllMetadata(conn);
        res.status(200).json(result);     
        return;   
      } else if (type === 'tooling') {
        const result = await getAllToolingData(conn);
        res.status(200).json(result);     
        return;   
      } else if (type === 'classes') {
        const result = await getAllApexClasses(conn);
        res.status(200).json(result);     
        return;   
      } else if (type === 'triggers') {
        const result = await getAllApexTriggers(conn);
        //const squash = Promise.all(result);
        res.status(200).json(result); 
        return;   
      } else if (type === 'flows') {
        const result = await getAllFlows(conn);
        //const squash = await Promise.all(result);
        res.status(200).json(result);     
        return;   
      } else if (type === 'approval') {
        const result = await retrieveMetadata(conn, 'ApprovalProcess');
        res.status(200).json(result);     
        return;   
      } else if (type === 'assignment') {
        const result = await retrieveMetadata(conn, 'AssignmentRules');
        res.status(200).json(result);     
        return;   
      } else if (type === 'aura') {
        const result = await retrieveMetadata(conn, 'AuraDefinitionBundle');
        res.status(200).json(result);     
        return;   
      } else if (type === 'connected') {
        const result = await retrieveMetadata(conn, 'ConnectedApp');
        res.status(200).json(result);     
        return;   
      } else if (type === 'duplicate') {
        const result = await retrieveMetadata(conn, 'DuplicateRule');
        res.status(200).json(result);     
        return;   
      } else if (type === 'lightningMessage') {
        const result = await retrieveMetadata(conn, 'LightningMessageChannel');
        res.status(200).json(result);     
        return;   
      } else if (type === 'permissionSet') {
        const result = await retrieveMetadata(conn, 'PermissionSet');
        res.status(200).json(result);     
        return;   
      } else if (type === 'pathAssistant') {
        const result = await retrieveMetadata(conn, 'PathAssistant');
        res.status(200).json(result);     
        return;   
      } else if (type === 'profile') {
        const result = await retrieveMetadata(conn, 'Profile');
        res.status(200).json(result);     
        return;   
      } else if (type === 'report') {
        const result = await retrieveMetadata(conn, 'Report');
        res.status(200).json(result);     
        return;   
      } else if (type === 'territory') {
        const result = await retrieveMetadata(conn, 'Territory');
        res.status(200).json(result);     
        return;   
      } else if (type === 'queueconfig') {
        const result = await retrieveMetadata(conn, 'QueueRoutingConfig');
        res.status(200).json(result);     
        return;   
      } else if (type === 'objects') {
        const result = await getAllObjects(conn);
        res.status(200).json(result);     
        return;   
      } else if (type === 'fields') {
        const result = await getAllFields(conn);
        res.status(200).json(result);     
        return;   
      } else if (type === 'validations') {
        const result = await getAllValidations(conn);
        res.status(200).json(result);     
        return;   
      } else {
        res.status(400);     
        return;   
      } 
    }
  } else if (req.method === 'POST') {
    if (!path.slug) {
      res.status(200).json({msg: 'nothing to see here'});
    } else if (path.slug[0] === 'metadata') {
      await uploadMetadata(req, res);
    } else if (path.slug[0] === 'data') {
      const sub = path.sub;
      const conn = await createConnection(sub as string);
      if (!conn) {
        res.status(400).json({err: 'no connection created'});
        return;
      }
      const result = await query(conn, req.body.query);
      res.status(200).json(result.records);
    }
  } else if (req.method === 'DELETE') {
    if (!path.slug) {
      const sub = path.sub;
      if (!sub) {
        res.redirect('/error');
      }
      await deleteAuth(sub as string);
      res.status(200);
    }  else if (path.slug[0] === 'metadata') {
      await deleteMetadata(req, res);
    } 
    
  }
}

const retrieveMetadata = async (conn: Connection, metadataType: string) => {
  return await conn.metadata.read(metadataType, '*');
}
export const getAuthUrl = (sub: string) => {
  return oauth2.getAuthorizationUrl({ scope : 'api id refresh_token', state: sub })
}

export const oauthCallback = async (code: string, sub: string ) => {
  const conn = new Connection({ oauth2 : oauth2 });
  const userInfo = await conn.authorize(code);

  const userDetails = await conn.identity();
  const payload = {
    id: nanoid(),
    accessToken: conn.accessToken, 
    refreshToken: conn.refreshToken || '', 
    instanceUrl: conn.instanceUrl,
    name: userDetails.username
  }
  await kv.hmset(`sfdc:${sub}`, payload);

  return userInfo;
}

export const getUserInfo = async (sub: string) => {
  return await kv.hgetall(`sfdc:${sub}`)
}

export const createConnection = async (sub:string) => {
  const userDetails = await kv.hgetall(`sfdc:${sub}`);
  if (!userDetails) {
    return null;
  }
  
  const conn = new Connection({
    oauth2 : oauth2,
    instanceUrl : userDetails.instanceUrl as string,
    accessToken : userDetails.accessToken as string,
    refreshToken : userDetails.refreshToken as string
  });

  return conn;
}

export const deleteAuth = async (sub:string) => {
  return await kv.hdel(`sfdc:${sub}`);
}

export const getAllMetadata = async (conn: Connection): Promise<any> => {
  const metadata = await conn.metadata.describe('52.0');
  return metadata;
}

export const getAllToolingData = async (conn: Connection): Promise<any> => {
  const metadata = await conn.tooling.describeGlobal();
  return metadata;
}

export const getAllApexClasses = async (conn: Connection) => {
  const queryResults = await conn.tooling.query('SELECT Id, Name, NamespacePrefix FROM ApexClass');
  //console.log(queryResults);
  const result = await queryResults.records.map(async (apexClass : any) => {
    //console.log(apexClass);
    const res = await conn.tooling.sobject('ApexClass').retrieve(apexClass.Id);
    //console.log(res);
    
    return {...res};
  });
  //console.log(result);
  return Promise.allSettled(result);
}

export const getAllApexTriggers = async (conn: Connection) => {
  const queryResults = await conn.tooling.query('SELECT Id, Name, NamespacePrefix FROM ApexTrigger');
  //console.log(queryResults);
  const result = await queryResults.records.map(async (apexTrigger : any) => {
    //console.log(apexClass);
    const res = await conn.tooling.sobject('ApexTrigger').retrieve(apexTrigger.Id);
    //console.log(res);
    
    return {...res};
  });
  //console.log(result);
  return Promise.allSettled(result);
}

export const getAllFlows = async (conn: Connection): Promise<any> => {
  // Find the Flow metadata type
  const types = [{type: 'Flow'} as ListMetadataQuery];
  const metadata = await conn.metadata.list(types, '39.0');
  if (metadata) {
    // Use readMetadata to get the Flow definition files
    const flowList = metadata.map((val) => {
      return val.fullName
    });
    const flowChunks = chunkArray(flowList, 10);
    const flowDataResult = await flowChunks.map(async (chunk) => {
      return await conn.metadata.read('Flow', chunk);
    })

    return Promise.allSettled(flowDataResult);
  } else {
    return [];
  }
  
}

/**
 * Retrieve fields for a specific object using Metadata API.
 * @param conn - Salesforce connection object.
 * @param objectName - Name of the object to retrieve fields for.
 * @returns - A promise that resolves with the fields of the object.
 */
async function getObjectFields(conn: Connection, objectName: string): Promise<any[]> {
  try {
    //const metadata: MetadataInfo = await conn.metadata.read('CustomObject', objectName) as MetadataInfo;
    const sObjectDescription: DescribeSObjectResult = await conn.describe(objectName);
    
    const fields = sObjectDescription.fields;
    if (!fields) {
      return [];      
    }

    return fields.map((field: Field) => {
      const picklistValues = field.type === 'picklist' ? field.picklistValues?.map((val) => {return val.value}) : []
      //console.log(picklistValues);
      const newField = {
        apiName : field.name,
        //label: field.label,
        // TODO : create static object to hold standard field data types
        dataType: field.type ? field.type : 'text',
        picklistValues
      };
      return newField;
    });
  } catch (error) {
    //console.error(`Error fetching fields for ${objectName}:`);
    throw error;
  }
}

/**
 * Main function to retrieve fields for selected objects.
 * @param accessToken - Salesforce access token.
 * @param refreshToken - Salesforce refresh token.
 * @param instanceUrl - Salesforce instance URL.
 * @param selectedObjects - Objects to retrieve fields for.
 * @returns - A promise that resolves with a map of fields for each object.
 */
export const getAllValidations = async function (
  connection: Connection
): Promise<{ [key: string]: any[] }> {
  const conn = connection;
  const fieldsMap: { [key: string]: any[] } = {};
  const selectedObjects = await getAllObjects(conn);

  for (const value of selectedObjects) {
    try {
      const metadata: any[] = await conn.metadata.read('ValidationRule', []) as any[];
      fieldsMap[value?.fullName] = metadata;
    } catch (error) {
      //console.error(`Error processing ${key}:`);
    }
  }

  return fieldsMap;
}

export const getAllFields = async function (
  connection: Connection
): Promise<{ [key: string]: any[] }> {
  const conn = connection;
  const fieldsMap: { [key: string]: string[] } = {};
  const selectedObjects = await getAllObjects(conn);

  for (const value of selectedObjects) {
    try {
      const fields = await getObjectFields(conn, value?.fullName as string);
      fieldsMap[value?.fullName] = fields;
    } catch (error) {
      //console.error(`Error processing ${key}:`);
    }
  }

  return fieldsMap;
}

export const getAllObjects = async (conn: Connection) : Promise<any> => {
  const types = [{type: 'CustomObject'}];
  return await conn.metadata.list(types, '52.0');
}

export const query = async (conn: Connection, q: string): Promise<Query<QueryResult<unknown>>> => {
  let records = [];
  const qry = conn
      .query(q)
      .on('record', function (record) {
          records.push(record);
      })
      .on('error', function (err) {
          console.log('QUERY ERROR : ' + err.message);
      })
      .run({ autoFetch: true, maxFetch: 4000 });
  return qry;
}

export default handler;
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
  // Specifies the maximum allowed duration for this function to execute (in seconds)
  maxDuration: 60,
}