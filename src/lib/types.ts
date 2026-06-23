export type ContentStatus =
  | 'Idea'
  | 'Shoot'
  | 'Editing'
  | 'Pending QC'
  | 'Pending Client Approval'
  | 'Amendments Requested'
  | 'Pending Hook & Caption'
  | 'Ready to Post'
  | 'Posted';

export type Visibility = 'Client-visible' | 'CCA internal only' | 'Editor-visible amendment';

export interface Client {
  id: string;
  name: string;
  company: string;
  hubName: string;
}

export interface Comment {
  id: string;
  author: string;
  role: 'Client' | 'Internal' | 'Editor';
  initials: string;
  timestamp: string;
  createdAt: string;
  body: string;
  visibility: Visibility;
}

export interface ActivityItem {
  id: string;
  icon: string;
  text: string;
  time: string;
}

export interface ContentItem {
  id: string;
  slug: string;
  title: string;
  clientId: string;
  category: string;
  postDate: string;
  duration?: string;
  status: ContentStatus;
  tags: string[];
  editor?: string;
  brief: string;
  hook?: string;
  caption?: string;
  comments: Comment[];
  activity: ActivityItem[];
}

export interface CalendarDay {
  date: number;
  muted?: boolean;
  items: ContentItem[];
  note?: string;
}

export interface QueueTask {
  id: string;
  column: 'Pending QC' | 'Pending Client Approval' | 'Amendments / Replies' | 'Hook & Caption';
  client: string;
  title: string;
  due: string;
  tags: string[];
  assignees: string[];
  slug?: string;
}

export interface AlertItem {
  id: string;
  icon: string;
  title: string;
  detail: string;
  priority: 'High' | 'Medium' | 'Low';
}
