export type LandingStep = {
  number: "1" | "2" | "3";
  title: string;
  japaneseName: string;
  description: string;
};

export type LandingNavigation = {
  isTransitioning: boolean;
  onBegin: (event: React.MouseEvent<HTMLAnchorElement>) => void;
};
