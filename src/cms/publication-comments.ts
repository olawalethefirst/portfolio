export type PublicationComment = {
  id: string;
  publicationId: string;
  parentId: string | null;
  name: string;
  bodyMarkdown: string;
  createdAt: string;
};

export type PublicationCommentInput = {
  publicationId: string;
  parentId: string | null;
  name: string;
  bodyMarkdown: string;
};
