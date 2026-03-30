import { FeishuApiService } from '../../../services/feishuApiService.js';
import { Logger } from '../../../utils/logger.js';
import { extractSpecialBlocks, appendSpecialBlockTextHints } from '../tools/toolHelpers.js';
import { normalizeDocumentId } from '../../../utils/document.js';

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

// ─── 文档评论 ─────────────────────────────────────────────────────────

const MAX_COMMENTS_LENGTH = 100000; // 100K chars threshold
const COMMENTS_TRUNCATED_MSG = `\n\n... [评论内容已截断，超过 ${MAX_COMMENTS_LENGTH} 字符上限] ...`;

export interface GetDocumentCommentsParams {
  fileToken: string;
  fileType?: string;
}

/**
 * 拉取文档全部评论及回复，渲染为 AI 友好的 Markdown 格式
 */
export async function getDocumentComments(
  params: GetDocumentCommentsParams,
  api: FeishuApiService,
): Promise<string> {
  const { fileToken: rawToken, fileType = 'docx' } = params;

  // URL → Token 归一化（兼容用户直接传入飞书文档 URL）
  let fileToken: string;
  try {
    fileToken = normalizeDocumentId(rawToken);
  } catch {
    // 如果归一化失败（如非标准格式），保留原值交给 API 层处理
    fileToken = rawToken;
  }

  Logger.info(`getDocumentComments invoked: fileToken=${fileToken}, fileType=${fileType}`);

  const comments = await api.listAllComments(fileToken, fileType);

  if (!comments || comments.length === 0) {
    return JSON.stringify({
      file_token: fileToken,
      total_comments: 0,
      markdown: '> 该文档暂无评论。',
      message: 'No comments found',
    }, null, 2);
  }

  // 直接从主接口返回的 reply_list 中提取内联回复（无需额外调用 /replies 接口）
  const commentsWithReplies: Array<{ comment: any; replies: any[] }> = comments.map(comment => ({
    comment,
    replies: comment.reply_list?.replies ?? [],
  }));

  // 渲染为 Markdown
  let md = `# 文档评论 (共 ${commentsWithReplies.length} 条)\n`;

  for (let i = 0; i < commentsWithReplies.length; i++) {
    const { comment, replies } = commentsWithReplies[i];
    const resolved = comment.is_solved ?? false;
    const statusTag = resolved ? ' (已解决 ✅)' : '';

    md += `\n---\n### 评论 #${i + 1}${statusTag}\n`;

    // 引用的文档原文
    const quote = extractQuoteText(comment);
    if (quote) {
      md += `> **引用：** ${quote}\n\n`;
    }

    // 主评论内容
    const mainContent = extractCommentContent(comment);
    const mainUser = extractUserName(comment);
    const mainTime = formatTimestamp(comment.create_time);
    md += `**${mainUser}** (${mainTime}):\n${mainContent}\n`;

    // 回复列表
    for (const reply of replies) {
      // 跳过与主评论相同的第一条回复（部分 API 把主评论也列入 replies）
      if (reply.reply_id === comment.comment_id) continue;

      const replyUser = extractUserName(reply);
      const replyTime = formatTimestamp(reply.create_time);
      const replyContent = extractCommentContent(reply);
      md += `\n  ↳ **${replyUser}** (${replyTime}):\n  ${replyContent}\n`;
    }
  }

  // 防洪截断
  if (md.length > MAX_COMMENTS_LENGTH) {
    Logger.warn(`评论内容过长(${md.length}字符)，截断至 ${MAX_COMMENTS_LENGTH}`);
    md = md.substring(0, MAX_COMMENTS_LENGTH) + COMMENTS_TRUNCATED_MSG;
  }

  return JSON.stringify({
    file_token: fileToken,
    total_comments: commentsWithReplies.length,
    markdown: md,
    message: md.length < MAX_COMMENTS_LENGTH
      ? 'Comments retrieved successfully'
      : 'Comments retrieved (truncated for safety)',
  }, null, 2);
}

// ─── 评论解析辅助函数 ─────────────────────────────────────────────────

/** 从评论对象中提取引用的原文内容 */
function extractQuoteText(comment: any): string {
  return comment.quote ?? '';
}

/** 从评论/回复对象中提取文本内容 */
function extractCommentContent(item: any): string {
  let contentObj = item.content;
  if (!contentObj) return '[空文本]';

  // 飞书接口中 content 经常是一个序列化后的 JSON 字符串
  if (typeof contentObj === 'string') {
    try {
      contentObj = JSON.parse(contentObj);
    } catch {
      // 解析失败直接当普通纯文本使用
      return contentObj;
    }
  }

  // 飞书评论内容存储在 content.elements 中，每个 element 有 type 和 text_run 等
  const elements = contentObj?.elements;
  if (!elements || !Array.isArray(elements)) {
    if (typeof contentObj === 'string') return contentObj;
    return typeof contentObj === 'object' ? JSON.stringify(contentObj) : '[无法解析评论内容]';
  }

  return elements
    .map((el: any) => {
      if (el.type === 'text_run') return el.text_run?.text ?? '';
      if (el.type === 'docs_link') return `[链接](${el.docs_link?.url ?? ''})`;
      if (el.type === 'person') return `@${el.person?.user_id ?? '用户'}`;
      return '';
    })
    .join('')
    .trim() || '[空评论]';
}

/** 从评论/回复中提取用户名 */
function extractUserName(item: any): string {
  const name = item.user_name ?? item.user?.name;
  if (name) return name;
  const userId = item.user_id;
  if (userId) return `用户ID: ${userId}`;
  return '未知用户';
}

/** 将秒级时间戳格式化为可读时间 */
function formatTimestamp(ts: any): string {
  if (!ts) return '未知时间';
  const n = typeof ts === 'string' ? parseInt(ts, 10) : ts;
  if (isNaN(n)) return '未知时间';
  // 飞书返回秒级时间戳
  const date = new Date(n * 1000);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}
