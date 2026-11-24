export type PageLoadedMessage = {
  type: "page-loaded";
  url: string;
  resources: string[];
};

export type Message = PageLoadedMessage;
