import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import sendResponse from '../utils/sendResponse';
import { Public } from 'src/common/decorators/public.decorators';
import type { Request, Response } from 'express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  AccountActiveDto,
  ChangePasswordDto,
  UpdateUserProfileDto,
} from './dto/update-account.dto';
import { CreateAttendanceDto } from './dto/attendence.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { userRole } from '@prisma';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgetPasswordDto';
import { S3Service } from '../s3/s3.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly cloudinaryService: CloudinaryService,
    private s3Service: S3Service, // ✅ Inject S3
  ) { }

  // refresh token
  @Post('refresh-token')
  @ApiOperation({
    summary: 'Refresh JWT tokens',
    description: 'Refreshes the access token using the provided refresh token.',
  })
  @ApiBody({
    description: 'Refresh token for refreshing access token',
    type: RefreshTokenDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully.',
  })
  async refreshToken(
    @Body('refreshToken') token: string,
    @Res() res: Response,
  ) {
    const result = await this.authService.refreshTokens(token);
    res.cookie('accessToken', result.access_token, {
      httpOnly: false, // Prevents client-side access to the cookie
      secure: false, // Only true for HTTPS
      maxAge: 86400000, // 1 day expiration
      sameSite: 'none', // Allow cross-origin requests to send the cookie
    });

    res.cookie('refreshToken', result.refresh_token, {
      httpOnly: false,
      secure: false, // Only true for HTTPS
      maxAge: 604800000, // 7 days expiration
      sameSite: 'none', // Allow cross-origin requests to send the cookie
    });
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Token refreshed',
      data: result,
    });
  }

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res() res: Response) {
    const result = await this.authService.register(dto);

    res.cookie('accessToken', result.access_token, {
      httpOnly: false, // Prevents client-side access to the cookie
      secure: false, // Only true for HTTPS
      maxAge: 86400000, // 1 day expiration
      sameSite: 'none', // Allow cross-origin requests to send the cookie
    });

    res.cookie('refreshToken', result.refresh_token, {
      httpOnly: false,
      secure: false, // Only true for HTTPS
      maxAge: 604800000, // 7 days expiration
      sameSite: 'none', // Allow cross-origin requests to send the cookie
    });
    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Registration successful',
      data: result,
    });
  }

  // login
  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const result = await this.authService.login(dto);
    res.cookie('accessToken', result.access_token, {
      httpOnly: false, // Prevents client-side access to the cookie
      secure: false, // Only true for HTTPS
      maxAge: 86400000, // 1 day expiration
      sameSite: 'none', // Allow cross-origin requests to send the cookie
    });

    res.cookie('refreshToken', result.refresh_token, {
      httpOnly: false,
      secure: false, // Only true for HTTPS
      maxAge: 604800000, // 7 days expiration
      sameSite: 'none', // Allow cross-origin requests to send the cookie
    });
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Login successful',
      data: result,
    });
  }

  @Post('create-admin')
  @Roles(userRole.ADMIN)
  @ApiOperation({
    summary: 'Create admin user',
    description: 'Allows an admin to create another admin user',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Admin user created successfully',
  })
  async createAdmin(@Body() dto: RegisterDto, @Res() res: Response) {
    const result = await this.authService.createAdmin(dto);

    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Admin user created successfully',
      data: result,
    });
  }

  // change password
  @Patch('change-password')
  @Roles(userRole.ADMIN, userRole.USER)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.authService.changePassword(req.user!.id, dto);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Password changed',
      data: result,
    });
  }

  @Put('activate-account')
  @Roles(userRole.ADMIN)
  async active_account(
    @Body() dto: AccountActiveDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const result = await this.authService.active_account(dto);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Account activated successfully',
      data: result,
    });
  }

  @UseInterceptors(FileInterceptor('image'))
  @Patch('update-profile')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Update user profile with optional image upload',
    type: UpdateUserProfileDto,
  })
  @ApiOperation({ summary: 'Update user profile (with optional image)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile updated successfully',
  })
  async updateProfile(
    @Req() req: any,
    @Body() updateDto: UpdateUserProfileDto,
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    const userId = req.user?.id;
    let imageUrl: string | null = null;

    if (file) {
      try {
        imageUrl = await this.s3Service.uploadFile(file, 'profile-images');
      } catch (error) {
        console.error(error, 'File Upload Error');
        // S3Service already wraps errors, but you can log or customize here
        return sendResponse(res, {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          success: false,
          message: 'Image upload failed. Please try again.',
          data: null,
        });
      }
    }

    const updatedUser = await this.authService.updateProfile(
      userId,
      updateDto,
      imageUrl,
    );

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  }

  @Public()
  @Post('record-attendence')
  @ApiResponse({ status: 201, description: 'Attendance recorded successfully' })
  async createAttendance(
    @Body() dto: CreateAttendanceDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const result = await this.authService.createAttendance(dto.id);

    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Attendance recorded successfully',
      data: result,
    });
  }

  @Get('get-attendence-ByDate')
  @Roles(userRole.ADMIN)
  @ApiQuery({
    name: 'date',
    type: String,
    description: 'Date in YYYY-MM-DD format',
    example: '2025-04-05',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Attendance list retrieved' })
  async getAttendanceByDate(@Query('date') date: string, @Res() res: Response) {
    const result = await this.authService.getAttendanceByDate(date);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Attendance records retrieved successfully',
      data: result,
    });
  }
  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Res() res: Response) {
    const result = await this.authService.forgotPassword(
      dto.username,
      dto.fcmToken,
    );

    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Reset Code sent successfully',
      data: result,
    });
  }

  @Public()
  @Post('forget-reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto, @Res() res: Response) {
    const result = await this.authService.resetPassword(
      dto.token,
      dto.newPassword,
    );

    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Reset Password successfull',
      data: result,
    });
  }

  @Get('me/:userId')
  @ApiOperation({
    summary: 'Check if a user is active',
    description: 'Returns  the user account ',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved user profile',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        message: 'User Profile retrieved',
        data: { isActive: true },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserProfile(@Param('userId') userId: string, @Res() res: Response) {
    const result = await this.authService.getUserProfile(userId);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'User profile retrieved',
      data: result,
    });
  }

  @Get('allUsers')
  @Roles(userRole.ADMIN)
  async getUsers(@Res() res: Response) {
    const result = await this.authService.getUsers();
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'User profile retrieved',
      data: result,
    });
  }

  @Get('getTopFiveUserByPoint')
  @Roles(userRole.ADMIN)
  async getTopFiveUserByPoint(@Res() res: Response) {
    const result = await this.authService.getTopFiveUserByPoint();
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Top 5 User  retrieved',
      data: result,
    });
  }

  @Get('notActivatedUsers')
  @Roles(userRole.ADMIN)
  async getNotActiveteUser(@Res() res: Response) {
    const result = await this.authService.getNotActiveteUser();
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'User retrieved succefully',
      data: result,
    });
  }

  @Delete('delete-account/:userId')
  @ApiOperation({ summary: 'Permanently delete user account' })
  @ApiParam({ name: 'userId', description: 'The ID of the user to delete' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  async deleteAccount(
    @Param('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.authService.deleteAccount(userId);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Account deleted successfully',
      data: result,
    });
  }
}

