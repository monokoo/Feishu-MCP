import { FeishuApiService } from '../../../services/feishuApiService.js';
import { Logger } from '../../../utils/logger.js';
import { extractSpecialBlocks, appendSpecialBlockTextHints } from '../tools/toolHelpers.js';

export interface CreateDocumentParams {
  title: string;
  folderToken?: string;
  wikiContext?: { spaceId: string; parentNodeToken?: string };
}

/**
 * 创建飞书文档（文件夹模式或知识库节点模式）
 */
export async function createDocument(params: CreateDocumentParams, api: FeishuApiService): Promise<any> {
  const { title, folderToken, wikiContext } = params;

  if (folderToken && wikiContext) {
    throw new Error(
      '错误：不能同时提供 folderToken 和 wikiContext 参数，请选择其中一种模式。\n' +
        '- 使用 folderToken 在飞书文档目录中操作\n' +
        '- 使用 wikiContext 在知识库中操作'
    );
  }
  if (!folderToken && !wikiContext) {
    throw new Error('错误：必须提供 folderToken（飞书文档目录模式）或 wikiContext（知识库节点模式）参数之一。');
  }

  if (folderToken) {
    Logger.info(`createDocument invoked: folder mode, title=${title}`);
    const newDoc = await api.createDocument(title, folderToken);
    if (!newDoc) throw new Error('创建文档失败，未返回文档信息');
    return newDoc;
  }

  if (!wikiContext) throw new Error('错误：内部参数状态异常。');
  const { spaceId, parentNodeToken } = wikiContext;
  if (!spaceId) {
    throw new Error('错误：使用 wikiContext 模式时，必须提供 spaceId。');
  }

  Logger.info(`createDocument invoked: wiki mode, title=${title}, spaceId=${spaceId}`);
  const node = await api.createWikiSpaceNode(spaceId, title, parentNodeToken);
  if (!node) throw new Error('创建知识库节点失败，未返回节点信息');

  return {
    ...node,
    _note: '知识库节点既是节点又是文档：node_token 可作为父节点使用，obj_token 可用于文档编辑操作',
  };
}

export interface GetDocumentInfoParams {
  documentId: string;
  documentType?: 'document' | 'wiki';
}

/**
 * 获取飞书文档信息（支持普通文档和 Wiki 文档）
 */
export async function getDocumentInfo(params: GetDocumentInfoParams, api: FeishuApiService): Promise<any> {
  const { documentId, documentType } = params;

  Logger.info(`getDocumentInfo invoked: documentId=${documentId}, type=${documentType ?? 'auto'}`);

  const docInfo = await api.getDocumentInfo(documentId, documentType);
  if (!docInfo) throw new Error('获取文档信息失败，未返回数据');

  return docInfo;
}

/**
 * 获取飞书文档块结构
 */
export async function getDocumentBlocks(documentId: string, api: FeishuApiService): Promise<string> {
  Logger.info(`getDocumentBlocks invoked: documentId=${documentId}`);

  const blocks = await api.getDocumentBlocks(documentId);
  const { imageBlocks, whiteboardBlocks } = extractSpecialBlocks(blocks);
  return appendSpecialBlockTextHints(JSON.stringify(blocks, null, 2), imageBlocks, whiteboardBlocks);
}

/**
 * 获取飞书文档并渲染为极简 Markdown 格式
 */
import { BlockRenderer, RenderResult } from '../utils/markdownRenderer.js';

const MAX_MARKDOWN_LENGTH = 200000; // 200K chars threshold
const TRUNCATED_WARNING_MSG = `\n\n... [CONTENT TRUNCATED FOR SAFETY > ${MAX_MARKDOWN_LENGTH} chars] ...`;
const MSG_SUCCESS = "Document rendered from blocks successfully";
const MSG_SUCCESS_TRUNCATED = "Document rendered from blocks successfully (Truncated for safety)";

export async function getFeishuDocumentMarkdown(documentId: string, api: FeishuApiService): Promise<string> {
  // P3: 降级全量 Info 日志，防止并发刷屏
  Logger.debug(`getFeishuDocumentMarkdown invoked: documentId=${documentId}`);

  try {
    const blocks = await api.getDocumentBlocks(documentId);
    
    // P2: 防御缺陷：缺失外源空数据拦截
    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
      Logger.warn(`No valid blocks returned for documentId=${documentId}`);
      return JSON.stringify({
        doc_id: documentId,
        title: "Unknown",
        length: 0,
        markdown: "",
        message: "Empty document or no accessible blocks returned"
      }, null, 2);
    }
  
    // P1: 健壮性风险：渲染入口补充全局异常捕获
    const renderer = new BlockRenderer(blocks);
    const result: RenderResult = renderer.render();

    // 防洪截断机制：应对远超负载异常大小文档的自我防御
    let md = result.markdown;
    if (md.length > MAX_MARKDOWN_LENGTH) {
      Logger.warn(`Document ${documentId} is too large (${md.length} chars), aggressively truncating at threshold.`);
      md = md.substring(0, MAX_MARKDOWN_LENGTH) + TRUNCATED_WARNING_MSG;
    }

    // 返回格式化的 JSON 字符串（包含元数据和 markdown 内容）
    return JSON.stringify({
      doc_id: result.doc_id,
      title: result.title,
      length: md.length,
      markdown: md,
      message: md.length < result.length ? MSG_SUCCESS_TRUNCATED : MSG_SUCCESS
    }, null, 2);
  } catch (error) {
    Logger.error(`Error rendering markdown for documentId=${documentId}:`, error);
    // 核心保护：返回兜底占位结构，避免 MCP 宿主崩溃
    return JSON.stringify({
      doc_id: documentId,
      title: "Error",
      length: 0,
      markdown: `> **[System Protection]** 无法成功渲染此飞书文档。\n\n**Renderer Exception:** ${(error as Error).message}`,
      message: "A critical error occurred during Markdown rendering"
    }, null, 2);
  }
}

export interface SearchDocumentsParams {
  searchKey: string;
  searchType?: 'document' | 'wiki' | 'both';
  offset?: number;
  pageToken?: string;
}

/**
 * 搜索飞书文档和/或知识库节点
 */
export async function searchDocuments(params: SearchDocumentsParams, api: FeishuApiService): Promise<any> {
  const { searchKey, searchType = 'both', offset, pageToken } = params;

  Logger.info(`searchDocuments invoked: searchKey=${searchKey}, type=${searchType}`);

  return api.search(searchKey, searchType, offset, pageToken);
}
