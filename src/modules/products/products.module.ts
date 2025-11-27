import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { Shop } from '../../modules/shops/entities/shop.entity';
import { ShopStats } from '../../modules/shops/entities/shop-stats.entity';
import { CloudinaryService } from '../../common/services/cloudinary.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage, ProductVariant, Shop, ShopStats]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService, CloudinaryService],
  exports: [ProductsService],
})
export class ProductsModule {}
