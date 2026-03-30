import { Logger } from '../../../utils/logger.js';
import { AuthService } from '../../../services/feishuAuthService.js';
import { FeishuBaseApiService } from '../../../services/feishu/FeishuBaseApiService.js';

/**
 * 飞书云文档评论服务
 * 负责拉取文档的所有评论及回复，自动处理分页
 */
export class FeishuCommentService extends FeishuBaseApiService {
  constructor(authService: AuthService) {
    super(authService);
  }

  /**
   * 自动分页拉取文档的全部主评论
   * @param fileToken 文件 Token
   * @param fileType  文件类型，如 doc / docx / sheet / bitable
   * @param pageSize  每页条数，默认 50（飞书上限 100）
   * @returns 所有评论对象数组
   */
  public async listAllComments(
    fileToken: string,
    fileType: string = 'docx',
    pageSize: number = 50,
  ): Promise<any[]> {
    try {
      const endpoint = `/drive/v1/files/${fileToken}/comments`;
      let pageToken = '';
      let allComments: any[] = [];

      do {
        const params: Record<string, any> = {
          file_type: fileType,
          page_size: pageSize,
        };
        if (pageToken) params.page_token = pageToken;

        const response = await this.get(endpoint, params);
        const items = response.items ?? [];
        allComments = [...allComments, ...items];
        pageToken = response.has_more ? (response.page_token ?? '') : '';

        Logger.debug(
          `listAllComments: 已拉取 ${allComments.length} 条评论，has_more=${response.has_more}`,
        );
      } while (pageToken);

      return allComments;
    } catch (error) {
      this.handleApiError(error, '获取文档评论列表失败');
      return [];
    }
  }

}
