import { Inject, Injectable } from '@nestjs/common';
import { Visitor } from '../../../../domain/entities/visitor.entity';
import { IVisitorRepository } from '../../../../domain/repositories/visitor.repository.interface';
import { StructuredLoggerService } from '../../../../infrastructure/logging/structured-logger.service';

@Injectable()
export class GetAllVisitorsUseCase {
  constructor(
    @Inject(IVisitorRepository)
    private readonly visitorRepository: IVisitorRepository,
    private readonly logger: StructuredLoggerService,
  ) {
    this.logger.setContext('GetAllVisitorsUseCase');
  }

  async execute(): Promise<Visitor[]> {
    this.logger.log('Attempting to fetch all visitors.');

    // Similar to GetVisitorDetailsUseCase, the repository's findAll method
    // should handle loading of necessary relations if they are expected
    // as part of the summary list of visitors.
    const visitors = await this.visitorRepository.findAll();

    this.logger.log(`Successfully fetched ${visitors.length} visitors.`, { count: visitors.length });
    return visitors;
  }
}
