export interface GetWbParentCategoriesResponse {
  data: {
    name: string;
    id: number;
    isVisible: boolean;
  }[];
}

export interface GetWbChildrenCategoriesResponse {
  data: {
    subjectID: number;
    parentID: number;
    subjectName: string;
    parentName: string;
  }[];
}
