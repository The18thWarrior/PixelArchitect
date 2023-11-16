export interface Metadata {
  metadata: any;
  tooling?: any;
  apex?: any[];
  triggers?: any[];
  flows?: any[];
  objects?: any[];
  objectFields?: any[];
  objectValidations?: any[];
}

export interface UserInfo extends Record<string, any> {
  id: string
  accessToken: string
  refreshToken: string
  instanceUrl: string
  name?: string
}
