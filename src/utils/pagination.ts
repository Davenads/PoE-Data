import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

/**
 * Pagination utility for splitting data into pages
 */
export class Paginator<T> {
  private items: T[];
  private itemsPerPage: number;
  public totalPages: number;
  public currentPage: number;

  constructor(items: T[], itemsPerPage: number) {
    this.items = items;
    this.itemsPerPage = itemsPerPage;
    this.totalPages = Math.ceil(items.length / itemsPerPage);
    this.currentPage = 0;
  }

  /**
   * Get items for the current page
   */
  getCurrentPageItems(): T[] {
    const start = this.currentPage * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.items.slice(start, end);
  }

  /**
   * Go to next page
   */
  nextPage(): boolean {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      return true;
    }
    return false;
  }

  /**
   * Go to previous page
   */
  previousPage(): boolean {
    if (this.currentPage > 0) {
      this.currentPage--;
      return true;
    }
    return false;
  }

  /**
   * Go to first page
   */
  firstPage(): void {
    this.currentPage = 0;
  }

  /**
   * Go to last page
   */
  lastPage(): void {
    this.currentPage = this.totalPages - 1;
  }

  /**
   * Check if on first page
   */
  isFirstPage(): boolean {
    return this.currentPage === 0;
  }

  /**
   * Check if on last page
   */
  isLastPage(): boolean {
    return this.currentPage === this.totalPages - 1;
  }

  /**
   * Get page indicator text
   */
  getPageIndicator(): string {
    return `Page ${this.currentPage + 1} of ${this.totalPages}`;
  }
}

/**
 * Create pagination buttons
 */
export function createPaginationButtons(
  paginator: Paginator<any>,
  customId: string
): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();

  // Only show First/Last buttons if there are more than 2 pages
  const showFirstLast = paginator.totalPages > 2;

  if (showFirstLast) {
    // First button
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${customId}_first`)
        .setLabel('⏮️ First')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(paginator.isFirstPage())
    );
  }

  // Previous button
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${customId}_prev`)
      .setLabel('◀️ Previous')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(paginator.isFirstPage())
  );

  // Next button
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${customId}_next`)
      .setLabel('Next ▶️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(paginator.isLastPage())
  );

  if (showFirstLast) {
    // Last button
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${customId}_last`)
        .setLabel('Last ⏭️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(paginator.isLastPage())
    );
  }

  return row;
}
