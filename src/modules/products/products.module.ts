import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { Shop } from '../../modules/shops/entities/shop.entity';
import { ShopStats } from '../../modules/shops/entities/shop-stats.entity';
<<<<<<< HEAD
import { CloudinaryService } from '../../common/services/cloudinary.service';
=======
import { Category } from '../categories/entities/category.entity';
>>>>>>> 2ac537fc98d52155aa1aac41cd83869d687d4535

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage, ProductVariant, Shop, ShopStats , Category,]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService, CloudinaryService],
  exports: [ProductsService],
})
export class ProductsModule {}
