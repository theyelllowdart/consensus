export interface Searcher<T> {
  search(query:string):angular.IPromise<T>
}
