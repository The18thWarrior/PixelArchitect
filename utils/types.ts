export interface Metadata {
  metadata: any;
  tooling?: any;
  apex?: any[];
  triggers?: any[];
  flows?: any[];
  objects?: any[];
  fields?: any[];
  validations?: any[];
  assignment?: any[];
  aura?: any[];
  connected?: any[];
  lightningMessage?: any[];
  permissionSet?: any[];
  pathAssistant?: any[];
  report?: any[];
}

export interface UserInfo extends Record<string, any> {
  id: string
  accessToken: string
  refreshToken: string
  instanceUrl: string
  name?: string
}

export interface Thread {
  threadId: string; 
  name: string; 
}