export {
  createDocument,
  getDocumentInfo,
  getDocumentBlocks,
  searchDocuments,
  getDocumentComments,
  getFeishuDocumentMarkdown,
} from './documentToolApi.js';
export type {
  CreateDocumentParams,
  GetDocumentInfoParams,
  SearchDocumentsParams,
  GetDocumentCommentsParams,
} from './documentToolApi.js';

export {
  batchUpdateBlockText,
  batchCreateBlocks,
  deleteDocumentBlocks,
  getImageResource,
  uploadAndBindImageToBlock,
  createTable,
  getWhiteboardContent,
  fillWhiteboardWithPlantuml,
} from './blockToolApi.js';
export type {
  BatchUpdateBlockTextParams,
  BatchCreateBlocksParams,
  DeleteDocumentBlocksParams,
  UploadAndBindImageParams,
  CreateTableParams,
  GetWhiteboardContentResult,
  FillWhiteboardParams,
} from './blockToolApi.js';

export {
  getRootFolderInfo,
  getFolderFiles,
  createFolder,
} from './folderToolApi.js';
export type {
  GetFolderFilesParams,
  CreateFolderParams,
} from './folderToolApi.js';
