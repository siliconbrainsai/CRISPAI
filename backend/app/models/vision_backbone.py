import torch
import torchvision.transforms as transforms
from torchvision.models import densenet121, DenseNet121_Weights

class VisionBackbone:
    def __init__(self, device='cpu'):
        self.device = device
        # Use updated torchvision initialization rather than deprecated pretrained=True
        self.model = densenet121(weights=DenseNet121_Weights.IMAGENET1K_V1).to(self.device)
        self.model.eval()
        self.gradients = None
        self.activations = None
        
        # Standardize ImageNet normalization
        self.preprocess = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def save_gradient(self, grad):
        self.gradients = grad

    def save_activation(self, module, input, output):
        self.activations = output

    def extract_features_and_gradcam(self, image_tensor, target_layer_name="features.denseblock4.denselayer16.conv2"):
        """
        Safely registers forward and backward hooks to extract Grad-CAM features,
        preventing memory leaks by explicitly removing hooks and clearing cache.
        """
        # Find target layer
        target_layer = None
        for name, module in self.model.named_modules():
            if name == target_layer_name:
                target_layer = module
                break
                
        if not target_layer:
            raise ValueError(f"Layer {target_layer_name} not found in model.")

        # Safely register hooks
        forward_handle = target_layer.register_forward_hook(self.save_activation)
        backward_handle = target_layer.register_full_backward_hook(
            lambda m, i, o: self.save_gradient(o[0])
        )

        try:
            image_tensor = image_tensor.to(self.device).requires_grad_(True)
            
            # Forward pass
            output = self.model(image_tensor)
            
            # Assuming binary classification or specific index is needed
            target_score = output[0][output.argmax()]
            self.model.zero_grad()
            
            # Backward pass
            target_score.backward()
            
            # Compute Grad-CAM
            pooled_gradients = torch.mean(self.gradients, dim=[0, 2, 3])
            activations = self.activations.detach()
            
            for i in range(activations.size(1)):
                activations[:, i, :, :] *= pooled_gradients[i]
                
            heatmap = torch.mean(activations, dim=1).squeeze()
            heatmap = torch.relu(heatmap)
            heatmap /= torch.max(heatmap)
            
            return output.detach(), heatmap.cpu().numpy()
        finally:
            # Prevent PyTorch OOM: Remove hooks explicitly and empty cache
            forward_handle.remove()
            backward_handle.remove()
            self.gradients = None
            self.activations = None
            torch.cuda.empty_cache()
