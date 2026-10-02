export interface ItemStats {
  id: string;
  title: string;
  views: number;
  likes: number;
}

export interface TimeSeriesData {
  date: string;
  views: number;
}

export interface PortfolioAnalytics {
  totalViews: number;
  totalLikes: number;
  topItems: ItemStats[];
  viewsByDay: TimeSeriesData[];
}
