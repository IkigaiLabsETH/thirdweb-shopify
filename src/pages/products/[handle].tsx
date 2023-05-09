import { SimpleTokenGate } from "@/CommerceKit/Gates/simple-gate";
import { NormalProduct } from "@/components/Products/NormalProduct";
import { NFT_RECEIPTS_ADDRESS } from "@/lib/environment-variables";
import { getAllProducts, getProductByHandle } from "@/lib/shopify";
import { GraphQLProducts, Product } from "@/types";
import {
  Box,
  Container,
  Flex,
  Heading,
  Image,
  Text,
  useNumberInput,
  useToast,
} from "@chakra-ui/react";
import { useUser } from "@thirdweb-dev/react";
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";
import Link from "next/link";
import { useState } from "react";
import { mutate } from "swr";

const Product: React.FC<InferGetStaticPropsType<typeof getStaticProps>> = ({
  product,
}) => {
  const toast = useToast();
  const {
    getInputProps,
    getIncrementButtonProps,
    getDecrementButtonProps,
    valueAsNumber,
  } = useNumberInput({
    step: 1,
    defaultValue: 1,
    min: 1,
    max: product?.tags?.includes("gated") ? 1 : 10,
  });
  const incrementProps = getIncrementButtonProps();
  const decrementProps = getDecrementButtonProps();
  const inputProps = getInputProps();
  const [selectedSize, setSelectedSize] = useState(
    product?.variants?.edges?.[0].node,
  );

  const isGated = product?.tags?.includes("gated");

  const user = useUser();

  const handleAddToCart = async () => {
    try {
      const quantity = valueAsNumber;
      const merchandiseId = selectedSize.id;

      await fetch("/api/cart/addLine", {
        method: "POST",
        body: JSON.stringify({
          quantity,
          merchandiseId,
          productHandle: product.handle,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      await mutate("/api/cart");
      toast({
        title: "Added to cart",
        description: "Your item has been added to your cart",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const GateComponent = isGated
    ? SimpleTokenGate
    : ({ children }: any) => children;

  return (
    <GateComponent gateContractAddress={NFT_RECEIPTS_ADDRESS}>
      <Container
        maxW={{
          base: "100%",
          lg: "container.page",
        }}
      >
        <Box mt={8}>
          <Link href="/">
            <Text color="#646D7A">&larr; Back to all products</Text>
          </Link>
          <Flex gap={4} mt={14}>
            <Box w="60%">
              <Image
                src={product?.images.edges[0].node.originalSrc}
                alt={product?.images.edges[0].node.altText}
              />
            </Box>
            <Box w="40%">
              <Heading as="h1" fontSize="40px">
                {product.title}
              </Heading>
              <Text fontSize="lg" color="#646D7A">
                {product.description}
              </Text>

              <NormalProduct
                product={product}
                selectedSize={selectedSize}
                setSelectedSize={setSelectedSize}
                incrementProps={incrementProps}
                decrementProps={decrementProps}
                inputProps={inputProps}
                handleAddToCart={handleAddToCart}
              />
            </Box>
          </Flex>
        </Box>
      </Container>
    </GateComponent>
  );
};

export default Product;

export interface ProductProps {
  product: Product;
}

export const getStaticProps: GetStaticProps<ProductProps> = async (ctx) => {
  const params = ctx.params;
  if (!params || !params.handle) {
    return {
      notFound: true,
    };
  }
  const handle = params.handle as string;
  try {
    const product = await getProductByHandle(handle);
    if (!product) {
      return {
        notFound: true,
      };
    }
    return {
      props: {
        product,
      },
    };
  } catch (error) {
    console.error(error);
    return {
      notFound: true,
    };
  }
};

export const getStaticPaths: GetStaticPaths = async () => {
  const { body } = await getAllProducts();
  const products = body.data.products as GraphQLProducts;
  return {
    fallback: "blocking",
    paths: products.edges.map(({ node }) => ({
      params: {
        handle: node.handle,
      },
    })),
  };
};
