import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { StructuredLoggerService } from '../logging/structured-logger.service';

@Catch() // Catch all exceptions
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: StructuredLoggerService) {
    // It's good practice to set a context for the logger if it's specific to this filter
    // this.logger.setContext('GlobalExceptionFilter');
    // However, we will pass 'GlobalExceptionFilter' as context in each log call for clarity
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number;
    let errorMessage: string | object;
    let internalMessage: string; // For logging, potentially more detailed

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      errorMessage = typeof exceptionResponse === 'string' ? { message: exceptionResponse } : exceptionResponse;
      internalMessage = exception.message;
    } else if (exception instanceof Error) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      errorMessage = { message: 'Internal server error. Please try again later.' };
      internalMessage = exception.message;
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      errorMessage = { message: 'An unexpected error occurred.' };
      internalMessage = 'Unexpected error without a message.';
    }

    const stackTrace = (exception as Error)?.stack || 'No stack trace available';

    // Log the error using StructuredLoggerService
    // CorrelationId and other request context will be automatically picked up
    this.logger.error(
      internalMessage,       // Log the internal or original exception message
      'GlobalExceptionFilter', // Logger context
      stackTrace,            // Stack trace
      {                      // Additional metadata for the log
        path: request.url,
        method: request.method,
        statusCodeSent: statusCode,
        clientErrorMessage: errorMessage, // What was sent to client
      }
    );

    // Construct the JSON response for the client
    const responseBody = {
      statusCode: statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(typeof errorMessage === 'string' ? { message: errorMessage } : errorMessage),
    };

    response.status(statusCode).json(responseBody);
  }
}
