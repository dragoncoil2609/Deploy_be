import { IsNotEmpty, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Mật khẩu hiện tại không được để trống' })
  currentPassword!: string;

  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message:
        'Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt',
    },
  )
  newPassword!: string;

  @IsNotEmpty({ message: 'Xác nhận mật khẩu mới không được để trống' })
  confirmPassword!: string;
}
