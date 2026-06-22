export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  sid: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  fid: string;
  type: 'refresh';
}
