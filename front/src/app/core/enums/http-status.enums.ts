/**
 * Enumeration of HTTP status codes.
 *
 * @see [MDN docs about HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
 */
export const enum HttpStatus {
  // ? 1xx Informational

  /** 100 Continue. */
  CONTINUE = 100,
  /** 101 Switching Protocols. */
  SWITCHING_PROTOCOLS = 101,
  /** 102 Processing. */
  PROCESSING = 102,
  /** 103 Early Hints. */
  EARLY_HINTS = 103,
  /** 103 Checkpoint. */
  CHECKPOINT = 103, // Deprecated in favor of EARLY_HINTS

  // * 2xx Success

  /** 200 OK. */
  OK = 200,
  /** 201 Created. */
  CREATED = 201,
  /** 202 Accepted. */
  ACCEPTED = 202,
  /** 203 Non-Authoritative Information. */
  NON_AUTHORITATIVE_INFORMATION = 203,
  /** 204 No Content. */
  NO_CONTENT = 204,
  /** 205 Reset Content. */
  RESET_CONTENT = 205,
  /** 206 Partial Content. */
  PARTIAL_CONTENT = 206,
  /** 207 Multi-Status. */
  MULTI_STATUS = 207,
  /** 208 Already Reported. */
  ALREADY_REPORTED = 208,
  /** 226 IM Used. */
  IM_USED = 226,

  // ? 3xx Redirection

  /** 300 Multiple Choices. */
  MULTIPLE_CHOICES = 300,
  /** 301 Moved Permanently. */
  MOVED_PERMANENTLY = 301,
  /** 302 Found. */
  FOUND = 302,
  /** 302 Moved Temporarily. */
  MOVED_TEMPORARILY = 302, // Deprecated in favor of FOUND
  /** 303 See Other. */
  SEE_OTHER = 303,
  /** 304 Not Modified. */
  NOT_MODIFIED = 304,
  /** 305 Use Proxy. */
  USE_PROXY = 305, // Deprecated
  /** 307 Temporary Redirect. */
  TEMPORARY_REDIRECT = 307,
  /** 308 Permanent Redirect. */
  PERMANENT_REDIRECT = 308,

  // ! --- 4xx Client Error ---

  /** 400 Bad Request. */
  BAD_REQUEST = 400,
  /** 401 Unauthorized. */
  UNAUTHORIZED = 401,
  /** 402 Payment Required. */
  PAYMENT_REQUIRED = 402,
  /** 403 Forbidden. */
  FORBIDDEN = 403,
  /** 404 Not Found. */
  NOT_FOUND = 404,
  /** 405 Method Not Allowed. */
  METHOD_NOT_ALLOWED = 405,
  /** 406 Not Acceptable. */
  NOT_ACCEPTABLE = 406,
  /** 407 Proxy Authentication Required. */
  PROXY_AUTHENTICATION_REQUIRED = 407,
  /** 408 Request Timeout. */
  REQUEST_TIMEOUT = 408,
  /** 409 Conflict. */
  CONFLICT = 409,
  /** 410 Gone. */
  GONE = 410,
  /** 411 Length Required. */
  LENGTH_REQUIRED = 411,
  /** 412 Precondition failed. */
  PRECONDITION_FAILED = 412,
  /** 413 Payload Too Large. */
  PAYLOAD_TOO_LARGE = 413,
  /** 413 Request Entity Too Large. */
  REQUEST_ENTITY_TOO_LARGE = 413, // Deprecated in favor of PAYLOAD_TOO_LARGE
  /** 414 URI Too Long. */
  URI_TOO_LONG = 414,
  /** 414 Request-URI Too Long. */
  REQUEST_URI_TOO_LONG = 414, // Deprecated in favor of URI_TOO_LONG
  /** 415 Unsupported Media Type. */
  UNSUPPORTED_MEDIA_TYPE = 415,
  /** 416 Requested Range Not Satisfiable. */
  REQUESTED_RANGE_NOT_SATISFIABLE = 416,
  /** 417 Expectation Failed. */
  EXPECTATION_FAILED = 417,
  /** 418 I'm a teapot. */
  I_AM_A_TEAPOT = 418,
  /** 419 Insufficient Space On Resource. */
  INSUFFICIENT_SPACE_ON_RESOURCE = 419, // Deprecated
  /** 420 Method Failure. */
  METHOD_FAILURE = 420, // Deprecated
  /** 421 Destination Locked. */
  DESTINATION_LOCKED = 421, // Deprecated
  /** 422 Unprocessable Entity. */
  UNPROCESSABLE_ENTITY = 422,
  /** 423 Locked. */
  LOCKED = 423,
  /** 424 Failed Dependency. */
  FAILED_DEPENDENCY = 424,
  /** 425 Too Early. */
  TOO_EARLY = 425,
  /** 426 Upgrade Required. */
  UPGRADE_REQUIRED = 426,
  /** 428 Precondition Required. */
  PRECONDITION_REQUIRED = 428,
  /** 429 Too Many Requests. */
  TOO_MANY_REQUESTS = 429,
  /** 431 Request Header Fields Too Large. */
  REQUEST_HEADER_FIELDS_TOO_LARGE = 431,
  /** 451 Unavailable For Legal Reasons. */
  UNAVAILABLE_FOR_LEGAL_REASONS = 451,

  // ! --- 5xx Server Error ---

  /** 500 Internal Server Error. */
  INTERNAL_SERVER_ERROR = 500,
  /** 501 Not Implemented. */
  NOT_IMPLEMENTED = 501,
  /** 502 Bad Gateway. */
  BAD_GATEWAY = 502,
  /** 503 Service Unavailable. */
  SERVICE_UNAVAILABLE = 503,
  /** 504 Gateway Timeout. */
  GATEWAY_TIMEOUT = 504,
  /** 505 HTTP Version Not Supported. */
  HTTP_VERSION_NOT_SUPPORTED = 505,
  /** 506 Variant Also Negotiates. */
  VARIANT_ALSO_NEGOTIATES = 506,
  /** 507 Insufficient Storage. */
  INSUFFICIENT_STORAGE = 507,
  /** 508 Loop Detected. */
  LOOP_DETECTED = 508,
  /** 509 Bandwidth Limit Exceeded. */
  BANDWIDTH_LIMIT_EXCEEDED = 509,
  /** 510 Not Extended. */
  NOT_EXTENDED = 510,
  /** 511 Network Authentication Required. */
  NETWORK_AUTHENTICATION_REQUIRED = 511,
}

/** Enumeration of HTTP status code series. */
export const enum HttpSeries {
  INFORMATIONAL = 'Informational',
  SUCCESSFUL = 'Successful',
  REDIRECTION = 'Redirection',
  CLIENT_ERROR = 'Client Error',
  SERVER_ERROR = 'Server Error',
}
